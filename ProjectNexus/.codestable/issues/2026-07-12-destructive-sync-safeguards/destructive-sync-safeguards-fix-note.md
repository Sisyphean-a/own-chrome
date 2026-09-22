---
doc_type: issue-fix
issue: 2026-07-12-destructive-sync-safeguards
path: standard
fix_date: 2026-07-13
related:
  - destructive-sync-safeguards-analysis.md
tags:
  - sync
  - data-loss
  - conflict
---

# 破坏性同步操作保护修复记录

## 1. 实际采用方案

采用已确认的方案 A：

1. 分类删除不再使用 `forceOverwrite`。首次索引写入执行正常远程冲突检查；失败时把被删除分类恢复到原位置。
2. 分类文件改为顺序清理；每次远程删除前重新检查 expected remote time，并使用删除返回时间串联下一步检查。
3. 最终索引提交前比对远程 index 内容与首次提交快照，防止本机清理产生的新时间掩盖其他设备的 index 更新；随后仍执行原有时间冲突检查。
4. 强制拉取前为本地文件、历史、索引和缓存建立恢复点。
5. 同步协调器增加显式 `forceFullShardPull` 选项，跳过时间与同步头捷径，并以 `null` changed-set 拉取 index 中全部分片。
6. 清理或拉取任一步失败时恢复全部本地状态；恢复失败时抛出包含原始错误和恢复错误的 `AggregateError`。
7. 清空阶段等待三个存储任务全部 settled 后才触发恢复，避免迟到清空覆盖已恢复数据。

## 2. 改动文件清单

- `src/core/application/facades/WorkspaceFacade.ts`：恢复分类删除的冲突保护、失败时恢复内存分类、串联远程时间。
- `src/core/application/facades/SyncFacade.ts`：强制全量配置、本地恢复点编排和失败恢复。
- `src/core/application/services/SyncService.ts`：透传显式全量选项并提供远程冲突检查入口。
- `src/core/application/services/sync/SyncDownCoordinator.ts`：显式全量拉取语义。
- `src/core/application/services/sync/ConflictGuard.ts`：最终提交前的远程 index 内容校验。
- `src/core/application/services/sync/SyncTypes.ts`：同步下载选项类型。
- `src/infrastructure/db/LocalFileRepository.ts`：IndexedDB 文件恢复点。
- `src/infrastructure/storage/LocalHistoryRepository.ts`：IndexedDB 历史恢复点。
- `src/infrastructure/storage/LocalStore.ts`：浏览器索引与缓存恢复点。
- `src/core/application/facades/__tests__/WorkspaceFacade.test.ts`：分类删除冲突与时间串联测试。
- `src/core/application/facades/__tests__/SyncFacade.test.ts`：强制全量、失败恢复和恢复失败测试。
- `src/core/application/services/sync/__tests__/SyncDownCoordinator.test.ts`：远程 shard-state 缺行时的完整分片拉取测试。
- 本 issue 的 report、analysis 与 fix-note。

未修改远程分片修复和账户级旧分片清理逻辑。

## 3. 验证结果

- 报告场景 A：测试确认删除最后分类时 `pushIndex` 不再收到 `force=true`；首次冲突后分类仍保留；清理前并发会被时间检查阻止；清理写入掩盖远程时间时会被 index 内容检查阻止最终覆盖。
- 报告场景 B：测试确认强制拉取使用显式全量选项；远程 shard-state 缺少分片行时仍以 `null` changed-set 拉取 index 全部分片；模拟远程失败后，三个恢复点全部执行。
- 清空竞态：deferred 测试确认所有清空任务结束前不会开始恢复。
- 恢复异常：测试确认恢复失败不会吞错，而是显式抛出组合错误。
- `npm test`：31 个测试文件、116 项测试全部通过。
- `npm run typecheck`：通过。
- `npm run lint`：通过，无 warning。
- `npm run build`：生产构建通过。
- `git diff --check`：通过。

## 4. 遗留事项

- 本地恢复点保存在当前进程内存中，可覆盖正常异常和网络失败；浏览器进程直接崩溃时无法执行恢复。这不属于本次报告的可捕获失败路径。
- 为避免破坏真实远程数据，未对生产 GitHub Gist 执行破坏性集成测试；并发和失败路径由依赖注入单测覆盖。
