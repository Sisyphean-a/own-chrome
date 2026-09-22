# 架构索引

## 范围地图

| 范围 | 当前入口 | 负责内容 |
| --- | --- | --- |
| `workspace` | `README.md`、本页 | 多包单仓库的组织、公共边界和记忆入口 |
| `package:h5-bridge-devtools` | [h5-bridge-devtools.md](packages/h5-bridge-devtools.md) | MV3 DevTools 扩展的主世界注入、页面桥接、存储、面板和开发预览 |

| `package:project-nexus` | [project-nexus.md](packages/project-nexus.md) | 保险库配置文件的 Gist 分片同步、端到端加密、历史快照与本地缓存 |
| `package:pulse-trace` | [pulse-trace.md](packages/pulse-trace.md) | 目标规则匹配、会话与心跳追踪、按日聚合日志与概览 |
| `package:code-pocket` | [code-pocket.md](packages/code-pocket.md) | 代码片段的本地库、Gist 同步与隔离运行 |
| `package:json-to-js` | [json-to-js.md](packages/json-to-js.md) | JSON 解析、字段筛选（指定层级/递归深度）与筛选代码生成 |

## 运行拓扑

```text
own-chrome/
  ├─ CodePocket/            -> 独立 WebExtension（Vue 3 + CRXJS 侧边栏）
  ├─ H5-Bridge-DevTools/    -> 独立 Chrome MV3 扩展（React + esbuild/Vite）
  ├─ ProjectNexus/          -> 独立 WebExtension（Vue 3 + Vite + CRXJS）
  ├─ PulseTrace/            -> 独立 Chrome MV3 扩展（原生 JS）
  └─ jsonToJs/              -> 独立 WebExtension（Vue 3 + Vuetify）
```

## 公共边界

- 包之间目前没有确认的共享协议、共享依赖或共享构建配置；根目录只放仓库级规则和记忆。消息通道、GitHub/Gist 远程访问、存储和加密都由各包分别实现，即使语义相近也不构成共享契约。
- 每个包独立声明 `package.json`、锁文件、构建脚本和扩展 manifest；同名路径（如 `src/`、`scripts/build.mjs`）只是各包自己的入口，不应因此抽取共享代码。
- 需要跨包复用机制时，先确认语义和生命周期确实相同，再新增明确的共享包或共享契约。

## 按范围加载

- 修改仓库组织、根配置或记忆入口：读取 `attention.md`、本页和 `requirements/CONTEXT.md`。
- 修改 `H5-Bridge-DevTools/`：额外读取 [h5-bridge-devtools.md](packages/h5-bridge-devtools.md) 和 [bridge-simulation.md](../requirements/contexts/bridge-simulation.md)。
- 修改 `ProjectNexus/`：额外读取 [project-nexus.md](packages/project-nexus.md) 和 [vault-sync.md](../requirements/contexts/vault-sync.md)。
- 修改 `PulseTrace/`：额外读取 [pulse-trace.md](packages/pulse-trace.md) 和 [activity-tracking.md](../requirements/contexts/activity-tracking.md)。
- 修改 `CodePocket/`：额外读取 [code-pocket.md](packages/code-pocket.md) 和 [snippet-library.md](../requirements/contexts/snippet-library.md)。
- 修改 `jsonToJs/`：额外读取 [json-to-js.md](packages/json-to-js.md) 和 [json-field-filtering.md](../requirements/contexts/json-field-filtering.md)。
