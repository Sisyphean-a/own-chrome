# JsonToJs - 智能 JSON 筛选工具

一个基于 Vue 3 的现代化 JSON 数据筛选平台，提供可视化的 JSON 处理和智能字段筛选功能。

## 🚀 核心特性

### 📊 可视化 JSON 处理

- **两列布局设计**：JSON 展示+输入 → 筛选结果预览
- **上下分割设计**：第一列采用上下分割，上部分展示 JSON，下部分提供输入和筛选功能
- **实时数据同步**：所有面板数据实时联动更新
- **智能 JSON 解析**：支持复杂嵌套结构的 JSON 数据处理

### � 智能字段筛选

- **两种筛选模式**：指定层级筛选和递归深度筛选
- **可视化字段选择**：点击 JSON 字段直接添加到筛选列表
- **多种输出格式**：支持对象格式和字段分组格式
- **实时筛选预览**：选择字段后自动执行筛选并显示结果

### 📋 便捷操作

- **剪切板支持**：一键读取剪切板中的 JSON 数据
- **字段智能推荐**：自动分析 JSON 结构并推荐常用字段
- **筛选配置保存**：记住用户的筛选偏好设置

## 🏗️ 技术架构

### 核心技术栈

- **前端框架**：Vue 3 + Composition API
- **构建工具**：Vite 6.x
- **UI 组件库**：Vuetify 3.x
- **状态管理**：Pinia
- **数据处理**：JSONPath

## 📁 项目结构

```
src/
├── components/                 # 全局可复用组件
│   ├── base/                      # 基础UI组件
│   │   ├── BaseModal.vue            # 基础模态框
│   │   ├── ModalHeader.vue          # 模态框头部
│   │   └── GlobalErrorDisplay.vue   # 全局错误显示
│   └── layout/                # 布局相关组件
│       ├── ResizableContainer.vue   # 可调整大小容器
│       ├── ResizableLayout.vue      # 水平布局
│       ├── ResizableRowLayout.vue   # 垂直布局
│       ├── ColumnHeader.vue         # 列头组件
│       └── RowHeader.vue            # 行头组件
├── features/                  # 功能模块（按业务域组织）
│   └── json-processor/        # JSON处理功能模块
│       ├── components/        # JSON处理相关组件
│       │   ├── JsonView.vue              # JSON视图显示
│       │   ├── JsonDisplayWithInput.vue  # JSON输入显示组合
│       │   ├── JsonResultDisplay.vue     # JSON结果显示
│       │   ├── FilterPanel.vue           # 筛选面板
│       │   └── ErrorDisplay.vue          # 错误显示
│       └── composables/       # JSON处理相关组合式函数
│           └── useJsonContext.js      # JSON上下文管理
├── shared/                    # 共享资源
│   ├── composables/           # 全局组合式函数
│   │   ├── useErrorHandler.js # 错误处理
│   │   └── useEventBus.js     # 事件总线
│   ├── constants/             # 全局常量
│   │   ├── app-config.js      # 应用配置
│   │   └── ui-config.js       # UI配置
│   └── utils/                 # 工具函数
│       ├── filterUtils.js     # 筛选工具
│       └── icons.js           # 图标配置
├── stores/                    # 状态管理
│   ├── jsonProcessor.js       # JSON处理状态
│   └── pageState.js           # 页面状态
├── views/                     # 页面组件
│   └── JsonToJsPage.vue       # 主页面
├── assets/                    # 静态资源
├── styles/                    # 样式文件
├── router/                    # 路由配置
├── App.vue
└── main.js
```

### 架构设计原则

#### 1. 功能模块化

- **按业务域组织**：JSON 处理功能独立成模块
- **清晰的边界**：每个模块职责明确
- **便于扩展**：新功能可按相同模式组织

#### 2. 组件分层

- **基础组件**：可在任何地方复用的 UI 组件
- **布局组件**：专门处理布局逻辑的组件
- **业务组件**：特定功能域的组件

#### 3. 状态管理

- **集中式管理**：使用 Pinia 管理全局状态
- **Context 模式**：功能模块内部使用 Context Provider
- **响应式数据流**：Vue 3 Composition API 确保数据响应性

## 🎨 界面设计

### 布局特点

- **两列布局**：JSON 输入+筛选 → 结果展示
- **可调整尺寸**：支持动态调整各列宽度
- **桌面端优化**：专为桌面端开发环境设计
- **响应式设计**：适配不同屏幕尺寸

## 🛠️ 开发指南

### 环境要求

- Node.js 16+
- npm 8+ 或 yarn 1.22+

### 快速开始

```bash
# 克隆项目
git clone <repository-url>
cd jsonToJs

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 🔧 核心功能详解

### JSON 筛选工作流

1. **数据输入与预览**：第一列上部分实时显示解析后的 JSON 结构，下部分提供输入框
2. **字段选择**：点击 JSON 字段或在筛选面板中选择要提取的字段
3. **筛选配置**：选择筛选模式（指定层级或递归深度）和输出格式
4. **结果查看**：第二列实时显示筛选后的结果

### 筛选功能详解

系统提供两种筛选模式：

#### 指定层级筛选

适用于有明确数组结构的 JSON 数据，从指定路径中提取字段：

```javascript
// 示例：从 json.users 数组中提取 name 和 email 字段
const targetData = json.users
const keys = ['name', 'email']
return targetData.map((item) => {
  const result = {}
  keys.forEach((key) => {
    if (item.hasOwnProperty(key)) {
      result[key] = item[key]
    }
  })
  return result
})
```

#### 递归深度筛选

适用于复杂嵌套结构，递归搜索整个 JSON 中的指定字段：

```javascript
// 示例：递归收集所有 name 和 email 字段
const keys = ['name', 'email']
const result = {}
keys.forEach((key) => {
  result[key] = []
})

function collectFields(obj, path = '') {
  if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach((key) => {
      if (keys.includes(key)) {
        result[key].push(obj[key])
      }
      if (typeof obj[key] === 'object') {
        collectFields(obj[key], path + '.' + key)
      }
    })
  }
}

collectFields(json)
return result
```

## 📖 使用示例

### 基础字段筛选

**输入 JSON：**

```json
{
  "users": [
    { "id": 1, "name": "张三", "age": 25, "city": "北京" },
    { "id": 2, "name": "李四", "age": 30, "city": "上海" }
  ]
}
```

**筛选操作：**

1. 选择筛选模式：指定层级筛选
2. 设置数组路径：`json.users`
3. 选择字段：`name`, `city`
4. 选择输出格式：对象格式

**输出结果：**

```json
[
  { "name": "张三", "city": "北京" },
  { "name": "李四", "city": "上海" }
]
```

## 🛠️ 开发和部署

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

---

**JsonToJs** - 让 JSON 数据筛选变得简单而强大 🚀
