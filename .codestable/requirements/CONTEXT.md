---
scope: workspace
---

# 领域上下文

本工作区用单仓库组织多个独立的浏览器扩展项目；当前唯一已归档的业务领域边界是 H5 原生桥接模拟。

## 作用域

- [context:bridge-simulation](contexts/bridge-simulation.md)：桥接方案、H5 请求、Android 回包、自动配对和独立安卓发送。代码位置：`H5-Bridge-DevTools/src/injected`、`H5-Bridge-DevTools/src/content`、`H5-Bridge-DevTools/src/shared`、`H5-Bridge-DevTools/src/panel`；实现包：`package:h5-bridge-devtools`。

- [context:vault-sync](contexts/vault-sync.md)：保险库、配置文件、分片与分片清单、同步头、冲突守卫、破坏性操作保护和恢复点。代码位置：`ProjectNexus/src/core`、`ProjectNexus/src/infrastructure`、`ProjectNexus/src/presentation`；实现包：`package:project-nexus`。

包是实现边界，不自动成为领域边界；当前没有跨包共享的领域上下文，也没有 `shared/` 页面。

## 作用域规则

- 一个术语或不变量只在最窄的拥有页面定义；其他页面链接，不复制定义。
- 当前代码和测试是实现事实的校验依据；`history/` 只承载变化原因、迁移来源和仍需追溯的风险。
- 记忆目录只有根级 `.codestable/`；子项目不得重新引入各自的 `.codestable/`。
