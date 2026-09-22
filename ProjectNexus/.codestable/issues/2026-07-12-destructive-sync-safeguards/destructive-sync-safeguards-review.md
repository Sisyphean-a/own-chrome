---
doc_type: issue-review
issue: 2026-07-12-destructive-sync-safeguards
status: passed
reviewer: subagent
reviewed: 2026-07-13
round: 3
---

# 破坏性同步操作保护代码审查报告

## 1. Scope And Inputs

- Report: `.codestable/issues/2026-07-12-destructive-sync-safeguards/destructive-sync-safeguards-report.md`
- Analysis: `.codestable/issues/2026-07-12-destructive-sync-safeguards/destructive-sync-safeguards-analysis.md`
- Implementation evidence: `destructive-sync-safeguards-fix-note.md`、全量测试与构建结果
- Diff basis: 当前工作区 unstaged diff 与本 issue 新增文件
- Baseline dirty files: none；当前 dirty 文件均可归因于本 issue

### Independent Review

- Detection: 原生 Task agent 可用；OCR CLI 已安装但缺少 LLM endpoint 配置
- 环节 A 独立隔离 Task agent: `native-agent + completed`（`/root/independent_review`，三轮复审）
- 环节 B OCR CLI: `failed`，原因是没有有效 LLM endpoint
- OCR severity mapping: High→blocking/important，Medium→nit/suggestion，Low→discarded
- Merge policy: 独立 reviewer 结果已逐条用本地代码事实核验后合并
- Gate effect: 第一轮 3 个 blocking；第二轮剩余 1 个；第三轮全部关闭

## 2. Diff Summary

- 新增：两个 facade 测试、issue report/analysis/fix-note/review
- 修改：`SyncFacade`、`WorkspaceFacade`、文件/历史/浏览器存储仓储
- 删除：none
- 未跟踪 / staged：新增文件未跟踪；无 staged diff
- 风险热点：远程并发、破坏性本地持久化、失败回滚、全量同步语义

## 3. Adversarial Pass

- 假设的生产 bug：自身清理写入掩盖其他设备写入；清空任务与回滚交错；远程分片状态不完整导致漏拉。
- 主动攻击过的反例：首次索引提交后另一设备写入、一个清空任务立即失败而另一个延迟成功、远程 index 含 A/B 但 shard-state 只含 A。
- 结果：三个反例均由当前代码路径支持，升级为 blocking。

## 4. Findings

### blocking

- [x] REV-001 `src/core/application/facades/WorkspaceFacade.ts:164` 分类清理产生的远程时间会掩盖另一设备的并发写入。
  - Evidence: 首次受保护 push 后，`deleteRemoteFile` 无冲突检查地更新 root；最终 push 使用该自身写入时间作为基线。
  - Impact: 另一设备在清理窗口写入的新索引仍可能被最终提交覆盖，原 P0 风险没有完全消除。
  - Expected fix scope: 每次会更新 root 的分类清理步骤必须先验证明确的 expected remote time，最终提交继续使用最新受保护基线。
  - Resolution: 每项清理前检查时间；清理后比较远程 index 与首次提交快照；最终 push 再检查时间。第三轮独立复审确认反例已关闭。

- [x] REV-002 `src/core/application/facades/SyncFacade.ts:101` 并行清空失败后可能在其他清空任务仍运行时启动回滚。
  - Evidence: `Promise.all` 在首个 rejection 时立即返回，其余清空 promise 不会被取消或等待。
  - Impact: 回滚完成后，迟到的清空任务可能再次删除已恢复的数据，同时 facade 误认为恢复成功。
  - Expected fix scope: 回滚前等待全部清空任务 settled，并为延迟清空反例增加确定性测试。
  - Resolution: 清空改用 `Promise.allSettled`；deferred 测试确认回滚不会提前开始。

- [x] REV-003 `src/core/application/facades/SyncFacade.ts:117` 清空 `shardStateDigest` 不能保证下载远程 index 中的全部分片。
  - Evidence: changed set 只包含 remote shard-state 现有行；合法但缺行的 shard-state 会漏掉 index 中的分片。
  - Impact: 强制拉取可以成功返回但本地文件不完整。
  - Expected fix scope: 为 force/full pull 增加显式全分片语义，使协调器直接选择 index 中全部分片，不依赖摘要差异间接模拟。
  - Resolution: 新增显式 `forceFullShardPull`，跳过时间和 sync-head 捷径并传 `null` changed-set；缺行测试通过。

### important

none

### nit

none

### suggestion

none

### learning

- 自身远程写入返回的更新时间不能证明期间没有第三方写入；必须在每个破坏性 root 写入前验证 expected time。

### praise

- 恢复阶段使用 `Promise.allSettled` 并以 `AggregateError` 保留同步错误和恢复错误，错误语义清晰。
- 首次索引冲突时按原位置恢复内存分类，方向正确。

## 5. Test And QA Focus

- QA 必须重点复核：首次 push 后并发写入；清空失败与延迟任务交错；remote shard-state 完整、缺行、缺失三种强拉场景。
- Evidence pack residual risks / gate warnings：OCR 未配置，不阻塞；独立 reviewer 已完成。
- 建议新增或加强的测试：分类清理前冲突测试、deferred clear 测试、协调器显式 full-pull 测试、真实仓储恢复点测试。
- 不能靠 review 完全确认的点：强拉期间 UI 是否彻底禁止新增本地写入；浏览器进程崩溃无法执行内存恢复点。

## 6. Residual Risk

- GitHub Gist 没有真正的条件写，最终检查与 `updateBatch` 之间仍有所有 push 共享的极短非原子窗口。
- index 结构比较对 JSON 属性顺序敏感，可能保守中止，但不会覆盖数据。
- 强拉期间若仍能产生新本地写入，失败恢复会回到操作开始时的快照；浏览器进程崩溃也无法执行内存恢复点。
- 真实 GitHub Gist 破坏性集成路径未执行，依赖自动化时序测试证明。

## 7. Verdict

- Status: passed
- Next: 返回 `cs-issue` 完成修复闭环。
