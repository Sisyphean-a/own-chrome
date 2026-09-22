# 项目记忆入口

`.codestable/` 是本单仓库的唯一默认记忆入口。开始工作时先读取本文件、`architecture/INDEX.md`，再按目标包读取对应架构页和领域上下文。

## 当前硬边界

- 本仓库是多个独立浏览器扩展包构成的单仓库；每个包是完整、可独立构建的项目，包之间目前没有确认共享的构建、依赖或业务协议，不要为了复用而合并入口或抽取共享代码。
- 记忆目录只有根级 `.codestable/`；包内不得再引入各自的 `.codestable/`，包级事实并入本目录对应范围。
- 包各自的代码、测试和当前配置优先于旧记忆；根记忆只保存会影响后续判断的稳定边界、术语和原因。
- `public/manifest.json` 是扩展声明、权限与允许注入站点的唯一清单；改动公开入口或权限时同步核对它和 `scripts/build.mjs`。
- 扩展配置与运行期状态以各包声明的 `chrome.storage.local` 键为准；不要用长期 background port 或内存映射作为跨页面状态来源。
- 领域语言和业务不变量由 `requirements/` 拥有：架构页只记录实现边界与落点，链接而不重复定义。
- 破坏性操作必须保留真实错误和可追溯结果：桥接日志、存储写入、规则包导入和图片字段写入失败必须显式呈现，不得伪造成功或静默降级。
- ProjectNexus 的破坏性同步（删除分类、强制全量拉取）不得为了跑通而去掉冲突检查或恢复点；失败必须恢复本地状态并真实抛出。
- 保险库密码和加密密钥不得上传远程；ProjectNexus 的加密层有未修复的安全发现，改动它前先读包页“已知开放风险”。
- ProjectNexus 的表现层（Vue 组件、stores、composables）不得直接 import `src/infrastructure/*` 或全局单例。
- PulseTrace 的聚合只发生在后台：内容脚本只发心跳，概览页只读聚合日志；追踪时长是心跳推导值，不得当作精确计时。
- CodePocket 的片段代码只能在独立标签或沙箱页面运行，不得在侧边栏、选项页或后台执行；GitHub token 只存本地设置。
- jsonToJs 不得引入 `eval`/`new Function` 执行筛选：预览结果必须由解析生成代码得到。

## 最小验证

- `H5-Bridge-DevTools/`：`npm run typecheck`、`npm run test`、`npm run build`；涉及真实扩展交互或图片字段写入时再运行 `npm run test:e2e`（脚本启动有界面 Chromium）。
- `ProjectNexus/`：`npm run typecheck`、`npm run test`、`npm run build`；改同步或加密时补 `npm run test:coverage` 与 `npm run lint`。
- `PulseTrace/`：`npm test`（无构建步骤）。
- `CodePocket/`：`npm run build`（无自动化测试）。
- `jsonToJs/`：`npm run build`、`npm run build:extension`（无自动化测试）。

记忆页面只记录已验证的术语、稳定规则、架构边界和重要原因；任务过程、截图、生成产物和可由代码直接表达的普通实现细节不进入这里。
