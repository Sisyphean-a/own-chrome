# own-chrome

这是一个包含多个独立浏览器扩展项目的单仓库。每个子目录都是一个完整项目，拥有自己的 `package.json`、锁文件、构建脚本、测试和构建产物。

## 子项目

| 目录 | 技术栈 | 用途 |
| --- | --- | --- |
| `H5-Bridge-DevTools/` | Chrome MV3 + React + esbuild/Vite | 在 DevTools 面板中模拟 Android/H5 桥接调用，管理规则、响应和日志 |

根目录不提供共享构建、共享依赖或共享扩展入口；各子项目保持独立构建。

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
