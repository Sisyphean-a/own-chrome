# own-chrome

这是一个包含多个独立浏览器扩展项目的单仓库。每个子目录都是一个完整项目，拥有自己的 `package.json`、锁文件、构建脚本、测试和构建产物。

## 子项目

| 目录 | 技术栈 | 用途 |
| --- | --- | --- |
| `CodePocket/` | Vue 3 + Element Plus + Tailwind + Dexie + CodeMirror | 侧边栏代码片段管理器，含沙箱运行与 GitHub 同步 |
| `H5-Bridge-DevTools/` | Chrome MV3 + React + esbuild/Vite | DevTools 面板中模拟 Android/H5 桥接调用，管理规则、响应与日志 |
| `ProjectNexus/` | Vue 3 + Vite + CRXJS + Dexie + Octokit | 配置文件以私有 Gist 分片同步，支持可选的按文件端到端加密 |
| `PulseTrace/` | Chrome MV3 + 原生 JS | 目标规则配置、系统活跃时长与页面交互心跳追踪、按日聚合 |
| `jsonToJs/` | Vue 3 + Vuetify + Pinia | JSON 筛选与转换工作台，可打包为扩展 |

根目录不提供共享构建、共享依赖或共享扩展入口；各子项目保持独立构建，各自声明扩展 manifest。

## 开发命令

命令需要在对应子项目目录执行：

```powershell
cd H5-Bridge-DevTools
npm ci
npm run dev        # 持续构建 dist/
npm run typecheck
npm run test
npm run build
npm run test:e2e   # 真实扩展交互验证，启动有界面 Chromium
```

- `ProjectNexus/`：`npm run dev`、`npm run typecheck`、`npm run test`、`npm run build`、`npm run lint`。
- `CodePocket/`：`npm run dev`（watch 构建）、`npm run build`。
- `PulseTrace/`：`npm test`；扩展在 Chrome 中以“加载已解压的扩展程序”直接加载，无构建步骤。
- `jsonToJs/`：`npm run dev`、`npm run build`、`npm run build:extension`。

## 项目记忆

`.codestable/` 是本仓库唯一的项目记忆入口；包内不再保留各自的记忆目录。
