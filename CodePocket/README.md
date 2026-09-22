# > Code Pocket\_

极简主义的浏览器侧边栏代码片段管理器。
拒绝臃肿，纯粹功能，极客专属。

## :: 系统状态 ::

- **核心版本**: 1.0.0
- **技术栈**: Vue 3 + Vite + TailwindCSS
- **存储引擎**: IndexedDB (Dexie)
- **编辑器**: CodeMirror 6

## // 功能模块

[x] **SidePanel 架构**: 沉浸式侧边栏开发体验
[x] **沙箱执行环境**: 安全隔离的本地代码运行沙盒
[x] **持久化存储**: 基于 Dexie 的高性能本地数据管理
[x] **热重载支持**: 毫秒级开发响应速度

## $ 初始化指令

```bash
# 克隆仓库
git clone https://github.com/your-repo/codepocket.git

# 进入目录
cd codepocket

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## $ 装载流程

1. 打开 Chrome 浏览器地址栏输入: `chrome://extensions`
2. 开启右上角 **"开发者模式"** 开关
3. 点击左上角 **"加载已解压的扩展程序"**
4. 选择项目根目录下的 `dist/` 文件夹

---

`> EOF_`
