# 架构索引

## 范围地图

| 范围 | 当前入口 | 负责内容 |
| --- | --- | --- |
| `workspace` | `README.md`、本页 | 多包单仓库的组织、公共边界和记忆入口 |
| `package:h5-bridge-devtools` | [h5-bridge-devtools.md](packages/h5-bridge-devtools.md) | MV3 DevTools 扩展的主世界注入、页面桥接、存储、面板和开发预览 |

## 运行拓扑

```text
own-chrome/
  └─ H5-Bridge-DevTools/  -> 独立 Chrome MV3 扩展（React + esbuild/Vite）
```

## 公共边界

- 包之间目前没有确认的共享协议、共享依赖或共享构建配置；根目录只放仓库级规则和记忆。
- 每个包独立声明 `package.json`、锁文件、构建脚本和扩展 manifest；同名路径（如 `src/`、`scripts/build.mjs`）只是各包自己的入口，不应因此抽取共享代码。
- 需要跨包复用机制时，先确认语义和生命周期确实相同，再新增明确的共享包或共享契约。

## 按范围加载

- 修改仓库组织、根配置或记忆入口：读取 `attention.md`、本页和 `requirements/CONTEXT.md`。
- 修改 `H5-Bridge-DevTools/`：额外读取 [h5-bridge-devtools.md](packages/h5-bridge-devtools.md) 和 [bridge-simulation.md](../requirements/contexts/bridge-simulation.md)。
