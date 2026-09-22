---
scope: package:project-nexus
code-paths:
  - ProjectNexus
---

# project-nexus 架构

WebExtension（Vue 3 + Vite + CRXJS）：以私有 GitHub Gist 为主存储、IndexedDB 为本地缓存做多设备配置同步，并提供可选的按文件端到端加密（保险库）。

## 代码边界

- 领域层 `ProjectNexus/src/core/domain/`：纯 TypeScript，无框架依赖 — `entities/NexusFile.ts`（聚合根）、`types.ts`（索引/分片/存储类型）、`services/LanguageRegistry.ts`（语言→扩展名）、`shared/Hash.ts`、`shared/IdGenerator.ts`。
- 应用层 `ProjectNexus/src/core/application/`：`dto/AppResult.ts`、`ports/`（IGistRepository、IFileRepository、ILocalStore、ICryptoProvider）、`facades/`（Auth、Workspace、Sync、History、Vault）、`services/`（FileService、SyncService、ShardManifestService）、`services/sync/`（SyncDownCoordinator、ShardPullService、ShardUpsertService、ConflictGuard、SyncHead、ShardFetchPlanner、ShardRepairService…）。
- 基础设施层 `ProjectNexus/src/infrastructure/`：`db/`（Dexie `NexusDatabase`、`LocalFileRepository`）、`github/GistRepository.ts`（Octokit）、`security/WebCryptoProvider.ts`（AES-GCM + PBKDF2）、`storage/`（`LocalStore`、`LocalHistoryRepository`）。
- 组合根与入口：`ProjectNexus/src/bootstrap/container.ts`、`bootstrap/appSession.ts`、`src/background.ts`、`src/manifest.json`、构建 `vite.config.mts`。
- 表现层：`ProjectNexus/src/presentation/`（stores、composables）、`src/components/`、`src/views/`。

## 分层边界规则

- 依赖方向：基础设施实现应用层 ports，领域层不依赖任何外环。
- Vue 组件不得 import `src/infrastructure/*` 或全局单例；`src/infrastructure/index.ts` 不向表现层导出可直接消费的单例。表现层需要外部能力时走 facade 或 composable。
- 预期工作流失败返回显式 `AppResult<T>`（`{ok:true,data}` | `{ok:false,code,message,cause?}`）；只有意外编程错误才抛异常。
- 工具链约束：仅支持 npm（`engines`：Node ≥ 18.18.0、npm ≥ 9.0.0）；覆盖率门禁 lines 35 / statements 35 / functions 60 / branches 60（`vite.config.mts`）。

## 同步与存储协议

- 远程主存储是私有 Gist 的 v2 分片结构，本地缓存是 IndexedDB（Dexie，NexusDB v4）；每次保存写历史快照。
- 智能同步先用增量元数据（Gist `updated_at`、`SyncHead`）判断是否需要拉取；`ShardFetchPlanner` 对 manifest 与文件拉取做有界并发。
- 推送前必须通过 `ConflictGuard`。破坏性操作（分类删除、强制全量拉取）不得绕过冲突检查：`forceFullShardPull` 跳过时间与同步头捷径，以 `null` changed-set 拉取 index 中的全部分片（`SyncDownCoordinator.ts`、`SyncTypes.ts`）。
- 强制拉取前为本地文件、历史、索引和缓存建立恢复点；任一步失败恢复全部本地状态，恢复失败抛出携带原始错误与恢复错误的 `AggregateError`（`SyncFacade.ts`、`WorkspaceFacade.ts`）。
- 领域语义与不变量（冲突、内容相同判定、E2EE 边界、破坏性操作保护）见 [vault-sync 领域上下文](../../requirements/contexts/vault-sync.md)。

## 已知开放风险

- 可信设备模式把保险库密码信封与解开它的 secret 同存 localStorage（`WebCryptoProvider.ts` 的 `TRUSTED_DEVICE_SECRET_KEY`、`applyTrustedPersistence`、`getOrCreateTrustedSecret`）：能读 localStorage 的途径即可还原密码。2026-06 审计 Finding 03，P1，未修复。
- PBKDF2 使用硬编码全局静态 salt（`WebCryptoProvider.ts` 的 `SALT`、`TRUSTED_SALT`）：相同密码跨用户派生相同密钥，削弱 E2EE；修复需要 per-vault 随机 salt 与存量密文懒迁移。Finding 04，P1，未修复。
- 内容相同判定仍以 32-bit DJB2 校验和为主，`sizeMatches` 只在 manifest 记录 `size` 时二次防御，旧数据（无 size）保持宽松。Finding 02 的缓解现状。
- index-only push 会写入失真的 `shardStateHash`（`SyncService.pushIndex`）；大文件 raw 拉取（`GistRepository.ts`）无并发。Finding 06、07，未修复。
- 结构债：`src/presentation/composables/` 与 `src/components/layout/composables/` 并存同名 composable。Finding 08，未修复。
- GitHub Gist 没有条件写：最终冲突检查与远程写入之间存在所有 push 共享的极短非原子窗口；真实 Gist 的破坏性路径只有自动化时序测试覆盖。2026-07 修复的已知残余风险。

## 验证入口

- `ProjectNexus/src/**/__tests__/**`、`ProjectNexus/tests/`（vitest）。
- `npm run typecheck`、`npm run test`、`npm run build`、`npm run lint`；`npm run test:coverage` 施加覆盖率门禁。
