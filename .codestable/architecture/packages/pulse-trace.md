---
scope: package:pulse-trace
code-paths:
  - PulseTrace
---

# pulse-trace 架构

Chrome Manifest V3 扩展（原生 JS，无构建步骤）：按目标规则追踪页面交互与系统活跃时长、维护会话、按日聚合日志；`overview` 页面展示聚合结果，`options` 页面管理规则与设置。

## 代码边界

- 公共契约 `PulseTrace/src/shared/constants.js`：存储键 `pulseTraceConfig`、`pulseTraceRuntimeState`，日志键前缀 `logs_`，消息类型 `PAGE_HEARTBEAT`，默认设置（心跳 10s、空闲阈值 60s）与检查点间隔 15s。共享模块用 IIFE 挂全局（`PulseTraceConstants`、`PulseTraceMatching`、`PulseTraceTrackingEngine`、`PulseTraceOverviewStorage`），同时导出 CommonJS 供 vitest 直接测试。
- `PulseTrace/src/background.js`：唯一聚合中心 — 载入配置、按空闲阈值设置 `chrome.idle`、响应 `chrome.idle.onStateChanged`、接收心跳、刷新活动上下文、维护运行时状态（2s 去抖落盘）、15s 检查点。
- `PulseTrace/src/content.js`：只按节流发送心跳，不做任何聚合。
- `PulseTrace/src/shared/tracking-engine.js`：会话状态机（`applyContext`、`recordHeartbeat`、`snapshot`、`closeOpenSession`）。
- `PulseTrace/src/shared/matching.js`：目标规则匹配（`exact` 全等、`domain` 通配符）。
- `PulseTrace/src/shared/background-utils.js`：配置归一化、空上下文、按日日志键与日志写入器。
- `PulseTrace/src/overview.js`、`src/shared/overview-aggregation.js`、`overview-grouping.js`、`overview-storage.js`、`overview-timeline.js`、`overview-url-renderer.js`：概览页的读取、聚合、分组、时间线与 URL 渲染。
- 入口与声明：`PulseTrace/manifest.json`（`storage`/`tabs`/`idle` 权限，`<all_urls>` 内容脚本，`src/options.html` 选项页）。

## 会话与聚合协议

- `tracking-engine.js` 是唯一会话状态机：`applyContext`、`recordHeartbeat`、`snapshot`、`closeOpenSession` 四个入口都先推进系统活跃时长再返回状态快照；后台只负责把状态落盘，不另算时长。
- 心跳经 `PAGE_HEARTBEAT` 消息进入后台；运行时状态 2s 去抖落盘，另有 15s 检查点兜底，`chrome.idle.onStateChanged` 时强制落盘。
- 日志键由 `background-utils.js` 的 `buildDayKey` 生成（本地时区，`logs_<年>_<月>_<日>`）；概览用 `chrome.storage.local.getKeys` 找出全部日志键，缺该 API 时明确抛错。
- 会话开启/结束条件、心跳归属和两种时长的语义见 [activity-tracking 领域上下文](../../requirements/contexts/activity-tracking.md)。

## 验证入口

- `PulseTrace/tests/*.test.js`（vitest：matching、tracking-engine、background-utils、overview-aggregation、overview-grouping、overview-storage）。
- `npm test`；扩展直接以未打包方式加载，没有构建步骤。
