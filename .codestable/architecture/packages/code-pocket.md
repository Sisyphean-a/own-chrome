---
scope: package:code-pocket
code-paths:
  - CodePocket
---

# code-pocket 架构

Chrome MV3 侧边栏扩展（Vue 3 + Element Plus + Tailwind，CRXJS/vite 构建）代码片段管理器：本地 IndexedDB 存储片段，可选把片段同步到 GitHub Gist，并在独立环境里运行片段代码。

## 代码边界

- `CodePocket/src/manifest.json`：`sidePanel`/`storage`/`tabs`/`scripting` 权限、`<all_urls>` 主机权限、`side_panel.default_path`；`sandbox.pages` 只包含 `src/sandbox.html`，沙箱 CSP 允许 `unsafe-eval`，扩展页面 CSP 不允许。
- `CodePocket/src/background.js`：仅设置点击图标打开侧边栏。
- `CodePocket/src/sidepanel/`：`App.vue` 编排列表、编辑器、设置与运行；`main.js` 挂载。
- `CodePocket/src/logic/storage.js`：Dexie `CodePocketDB`（v1），`snippets` 表（`++id, uuid, title, *tags, createdAt, updatedAt`）与 `content` 字段。
- `CodePocket/src/logic/github.js`：`GithubService`（列表/创建/更新/取详情、`prepareGistFiles`）；固定用一个描述为 `CodePocket Sync Data` 的私有 gist，`index.json` 存元数据、`<uuid>.html` 存片段代码。
- `CodePocket/src/logic/runner.js`：当前 UI 的运行入口 — 把代码编码为 `data:text/html` 在新标签打开，并关闭上一次的 runner 标签（`lastRunnerTabId`）。
- 组件与文案：`src/components/SnippetList.vue`、`SnippetEditor.vue`、`Settings.vue`、`src/logic/i18n.js`。
- 保留但当前 UI 未引用：`src/viewer.html` + `viewer.js`、`src/sandbox.html`、`src/runner.html` + `runner-page.js`（另一条经 iframe 沙箱、并把下载请求转交宿主的运行路径）。

## 同步与运行边界

- 同步是设置页里的手动动作：上传走 `prepareGistFiles` → `createGist`/`updateGist`，下载走 `getGist` → `getGistDetail` 重建本地片段；固定使用一个描述为 `CodePocket Sync Data` 的私有 gist。
- 当前 UI 的运行入口只有 `logic/runner.js`（data: URL 新标签，并关闭上一个 runner 标签）；`viewer.html` + `sandbox.html` 和 `runner.html` + `runner-page.js` 是另一条基于 iframe 沙箱与 `postMessage` 的运行路径，当前 UI 未引用。
- `manifest.json` 的 `sandbox.pages` 只登记沙箱页面；沙箱 CSP 允许 `unsafe-eval`，扩展页面 CSP 不允许。
- 片段字段与 uuid、远程文件布局、凭证和隔离运行规则见 [snippet-library 领域上下文](../../requirements/contexts/snippet-library.md)。

## 验证入口

- `npm run build`（CRXJS + vite 打包，产物 `dist/`）；仓库没有自动化测试。
