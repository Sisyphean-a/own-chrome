---
scope: package:h5-bridge-devtools
code-paths:
  - H5-Bridge-DevTools
---

# h5-bridge-devtools 架构

Chrome Manifest V3 DevTools 扩展，在受支持页面中模拟可配置的 Android/H5 桥接，并在 DevTools 面板管理规则、响应和日志。

## 代码边界

- `H5-Bridge-DevTools/public/manifest.json`：扩展声明、权限、站点清单和扩展入口；`scripts/build.mjs` 把它的 `host_permissions` 作为唯一站点来源注入两处 `content_scripts.matches`。
- `H5-Bridge-DevTools/src/devtools/devtools.ts`：DevTools 面板注册；`src/panel/panel.tsx`：React 面板根。
- `H5-Bridge-DevTools/src/injected/injectMain.ts`：页面主世界注入，绑定当前方案的宿主对象、捕获 `postMessage`、回放响应事件。
- `H5-Bridge-DevTools/src/content/`：content script 的桥接调用接收、当前 origin 快照和规则命令执行。
- `H5-Bridge-DevTools/src/background/serviceWorker.ts`：一次性面板命令转发、缺少收件端时的重新注入、状态写入串行队列。
- `H5-Bridge-DevTools/src/shared/`：跨层类型、消息、存储、方案、预置和纯规则逻辑的唯一契约层；`stateCommands.ts` 定义内容脚本与后台之间的确定性状态增量命令协议。
- 构建入口：`scripts/build.mjs`（background、content、main-world 注入脚本产物）与 `vite.config.ts`（面板类扩展页面产物）。
- `H5-Bridge-DevTools/src/panel/preview.tsx`、`previewRuntime.ts`：开发预览用的受控 Chrome API 模拟，不是扩展生产通信路径。

## 运行时契约

Chrome 可随时回收 MV3 service worker，功能不依赖常驻 worker 端口或 worker 内存映射：

- `chrome.storage.local` 是规则、设置和日志的共享状态来源；已打开的 content script 与 panel 监听其变化并刷新快照。
- panel 用一次性 `runtime.sendMessage` 发出命令，background 无状态地用 `tabs.sendMessage` 转发；tab 缺少 content 收件端时，background 先程序化注入 main-world 注入脚本和 content script，再重试一次命令。
- 注入脚本必须幂等，以允许上述恢复路径重复执行。
- 不采用长期 `runtime.Port` 断开重连或阻止 worker 休眠：前者只能缓解端口失效，不能消除功能对可回收 worker 内存的依赖；后者平台不保证。
- 扩展被手动重载后，已打开页面仍需重新打开面板或执行命令，才能触发重新注入并恢复旧页面监听。该限制来自扩展上下文已被销毁，不是同步回退机制。

## 状态与写入协议

`chrome.storage.local` 中的 `h5BridgeDevTools:v2` 是共享状态来源（`src/shared/constants.ts`、`storage.ts`）。状态先按 origin，再按活动桥接方案分桶；每个 origin 同时保存方案定义和各方案的发送条目、日志、设置（`src/shared/bridgeTypes.ts`）。content 和 panel 都监听该存储键，只在本 origin 切片或全局开关变化时刷新；panel 的未保存草稿仍保留并提示远端更新（`src/content/runtime.ts`、`src/panel/runtimeBridge.ts`、`src/panel/helpers.ts`）。

所有运行期状态变更走 `APPLY_STATE_COMMAND` 确定性增量命令（`src/shared/stateCommands.ts`）：内容脚本把命令同时应用到本地镜像并经 `runtime.sendMessage` 交给后台，后台在串行队列里读最新存储、应用同一命令、写回（`src/background/serviceWorker.ts`）。会生成新 id 的操作（导入、复制）在发送侧物化为 `REPLACE_*` 命令，保证镜像与存储收敛。单次写入失败只影响该命令：内容脚本写链与后台队列都继续工作；页面 payload 在入点经 `sanitizeForStorage` 净化（`src/shared/json.ts`）。低频初始化写入（如按设置清空日志）直接调用 `persistOriginScopedState`。

旧 `h5BridgeDevTools:v1` 的单规则数据仅在首次读取时迁移到当前结构，迁移成功后移除旧键（`src/shared/migrate.ts`）。

## 桥接调用路径

1. 注入脚本按活动方案选择一个页面宿主对象；内置方案定义于 `src/shared/bridgeProfiles.ts`，导入规则包可通过持久状态新增方案，并同步已知宿主对象以恢复非活动 mock。
2. H5 调用该对象的 `postMessage` 后，注入脚本把原始值和解析结果作为 `BRIDGE_CALL` 发给页面自身。
3. content controller 按活动方案的 `requestEventField`（默认 `event`）提取解析消息、记录日志，并在全局开关和自动模拟均开启时查找活跃响应。
4. 命中的响应经延迟后作为 `DISPATCH_EVENT` 回到注入脚本，后者 `dispatchEvent(new CustomEvent(eventName, { detail }))`。

请求与响应的领域语义、匹配边界见 [bridge-simulation 领域上下文](../../requirements/contexts/bridge-simulation.md)。

## 面板与预览

规则页分为自动配对、`H5 -> 安卓` 和 `安卓 -> H5` 三个视图（`src/panel/components/RuleWorkspace.tsx` 及其 `rules/` 子组件）。工具栏的规则包导入/导出使用 JSON 或 YAML，规则包包含方案、可选设置和发送条目，解析与校验位于 `src/shared/rulePackage.ts`；YAML 解析器仅在用户选择规则包后动态加载，不参与面板启动。`src/panel/navigationState.ts` 是 tab、详情和后退历史的唯一导航状态层；它跳过已删除对象并避免在可编辑控件中截获鼠标后退键。

构建期约束：`vite.config.ts` 对扩展页面禁用 Vite module preload，避免 DevTools 的跨 world 扩展资源失配；`scripts/build.mjs` 在任何构建开始前清空 `dist/`（vite `emptyOutDir` 关闭，避免 watch 模式删除并发写入的 esbuild 产物）。

## 领域规则的实现落点

桥接领域语义（方案隔离、匹配条件、活跃响应、延迟上下限、交付形态、开关语义、名称安全）由 [bridge-simulation 领域上下文](../../requirements/contexts/bridge-simulation.md) 定义；本包只在以下位置实现和加固，不在此重述规则：

- 状态隔离与结构迁移：`src/shared/bridgeTypes.ts`、`storage.ts`、`migrate.ts`；运行期写入路径见上节协议。
- 匹配与回包：`src/content/controller.ts`（提取请求、延迟派发、派发前复检）、`src/shared/rules.ts`（响应校验与延迟上限）、`src/panel/responseActions.ts`（编辑校验）、`src/shared/rulePackage.ts`（导入校验）。
- 方案与名称安全：`src/shared/bridgeProfiles.ts` 的标识符模式和宿主、全局、原型名称黑名单；规则包导入复用同一校验。
- 面板可见性：规则页的三个视图和计数在 `src/panel/components/RuleWorkspace.tsx`；动态方案没有内置模板时 `src/shared/presets.ts` 返回空列表，面板照常渲染。
- 导航降级：`src/panel/navigationState.ts` 跳过已删除对象，详情路由失效时回到可渲染的列表页。
- 入点净化：`src/content/controller.ts` 在记录与写入前调用 `sanitizeForStorage`（`src/shared/json.ts`），不可序列化值不得进入存储或日志。

## 验证入口

- `H5-Bridge-DevTools/src/**/*.test.ts`、`src/panel/components/rules/ResponsesView.test.tsx`（vitest）。
- `npm run typecheck`、`npm run test`、`npm run build`。
- `npm run test:e2e`（`scripts/verify-extension-e2e.mjs`，启动有界面 Chromium，覆盖真实扩展交互、图片字段写入和图片原文折叠）。
