# H5 桥接调试工具

Chrome Manifest V3 开发者工具扩展，用于在浏览器里模拟 Android `window.AndroidBridge.postMessage(...)`，帮助 H5 页面在本地跑通登录、相机、联系人、活体、定位等依赖原生桥接的流程。

## 功能

- 开发者工具自定义 `H5 桥接` 面板
- `document_start` 注入 `window.AndroidBridge`
- 捕获桥接调用并记录 `发送 / 模拟 / 手动发送 / 警告 / 错误` 日志
- 按 `event` 规则自动 `dispatchEvent`
- 规则 CRUD、启用/禁用、复制、搜索
- 所有站点共享桥接方案、规则、设置和日志
- 导入 JSON / YAML 完整规则包、导出 JSON 规则包，可新增桥接宿主对象
- 手动发送原生消息
- 内置登录、相机、联系人、活体、定位、上传大 JSON、`baseRequest` 模板
- 从日志快速创建规则

## 安装依赖

```bash
npm install
```

## 本地开发

```bash
npm run dev
```

该命令会持续构建 `dist/`，可用于扩展开发调试。

## 构建扩展

```bash
npm run typecheck
npm run build
```

构建产物输出到 `dist/`。

## Chrome 加载已解压扩展程序

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启右上角 `开发者模式`
3. 点击 `加载已解压的扩展程序`
4. 选择项目里的 `dist/` 目录

## 如何使用

1. 打开目标 H5 页面，例如 `http://localhost:5173`
2. 按 `F12` 打开开发者工具
3. 切换到顶部 `H5 桥接` 面板
4. 保持“模拟已开启”
5. 导入规则包，或在左侧选择模板创建规则、新建空白规则
6. 页面调用：

```js
window.AndroidBridge.postMessage(JSON.stringify({ event: "openCamera" }))
```

7. 右侧日志会出现 `发送 openCamera`
8. 如果存在启用的 `openCamera` 规则，页面会收到：

```js
window.dispatchEvent(
  new CustomEvent("openCamera", {
    detail: {
      success: true,
      uri: "mock://camera/photo-001.jpg",
      data: "mock-image-data"
    }
  })
)
```

9. 面板日志会追加 `模拟 openCamera`
10. 可在“手动发送”区域手动发送原生事件测试页面监听逻辑

## 旧数据迁移

升级后以 `http://localhost:5173` 的原有数据初始化全局方案库，旧站点数据保留在本地存储中；若存在旧数据但找不到该来源，扩展会提示错误而不覆盖旧数据。全新安装直接使用默认方案。切换方案或修改规则、设置与日志会影响所有已打开的受支持页面。

## 站点白名单

在 H5 桥接面板的“设置”中添加 HTTP 或 HTTPS 域名，并在 Chrome 授权提示中确认。输入 `https://loan-test.com` 会匹配该域名及其所有子域名，但不匹配 HTTP；输入 `https://ec-web.loan-test.com` 不会匹配其他兄弟域名。添加或移除后刷新目标页面。内置站点不显示在手动白名单中；其他重叠白名单或内置权限仍可能允许注入。白名单仅控制注入范围，所有允许的站点共享方案和规则。

## 规则包格式

点击工具栏“导入”可选择 `.json`、`.yaml` 或 `.yml` 文件。一个文件定义一套桥接方案、可选设置和全部规则；导入后会切换到该方案。导出会生成同一格式的 JSON 文件。已有桥接项目可按[规则包生成指南](docs/bridge-rule-package-guide.md)收集最小事实并生成文件，无需通读完整代码。

```yaml
version: 1
name: Demo 规则包
profile:
  id: demo-app
  title: Demo App
  hostObject: DemoBridge
  requestEventField: event
settings:
  autoMock: true
  overrideExistingBridge: true
senders:
  - name: 登录
    matchEvent: login
    responses:
      - name: 成功
        delayMs: 0
        eventName: login
        detail:
          success: true
```

`profile.id` 必须是稳定的字母、数字、`.`、`_` 或 `-` 标识；`hostObject` 必须是合法且非保留的 JavaScript 全局属性名。`requestEventField` 可选，指定请求消息中的事件字段，省略时为 `event`。发送条目和响应的 `id` 可省略，导入时会自动生成。导入策略只影响该规则包内的 `senders`：合并、替换或追加但不关联。

## 常见问题

### 1. 为什么页面没有 `window.AndroidBridge`？

- 确认当前页面命中内置站点或设置中的站点白名单，并已授予站点权限
- 确认扩展已重新加载
- 确认“设置”里的“覆盖 AndroidBridge”没有关闭，且页面原本没有同名原生桥接覆盖

### 2. 为什么有 `SEND` 没有 `MOCK`？

- “模拟已开启”或“自动模拟”可能已关闭
- 当前规则没有活跃响应
- 当前规则的 `matchEvent` 与发送的 `event` 不一致

### 3. 为什么导入后规则没有生效？

- 检查规则包的 `profile.hostObject` 是否与页面调用的宿主对象一致
- 规则按桥接方案隔离并由所有站点共享，请确认当前开发者工具面板对应的是目标页面和正确方案

### 4. 日志为什么会被清空？

- 默认“保留日志 = false”
- 可在“设置”中开启保留日志并调整“日志上限”
