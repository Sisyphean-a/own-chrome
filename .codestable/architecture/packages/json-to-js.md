---
scope: package:json-to-js
code-paths:
  - jsonToJs
---

# json-to-js 架构

Vue 3 + Vuetify + Pinia 的 Chrome MV3 扩展（同一套代码可作扩展或 web 应用运行）：把 JSON 解析、字段筛选（指定层级 / 递归深度）和筛选代码生成放在一个可拖拽分栏的工作台里。

## 代码边界

- 状态：`jsonToJs/src/stores/jsonProcessor.js`（`useJsonProcessorStore`：输入、解析结果、筛选配置、执行状态）、`src/stores/pageState.js`。
- 领域逻辑：`jsonToJs/src/shared/utils/filterUtils.js` — 代码生成（`generatePathAccessCode`、`generateSpecifiedLevelFilterCode`、`generateRecursiveFilterCode`、`generateFilterCode`、`generateAdvancedFilterCode`）与结果执行（`executeFilterCode` → `executeFilterCodeSafely` → `analyzeFilterCode` → `executeSpecifiedLevelFilter` / `executeRecursiveFilter`），另外提供 `validateFilterConfig`、`getFilterMethodInfo`、`getOutputFormatInfo`、`analyzeJsonStructure`、`debounce`。
- 界面：`jsonToJs/src/features/json-processor/components/*`（FilterPanel、JsonView、JsonDisplayWithInput、JsonResultDisplay、ErrorDisplay）、`src/features/json-processor/composables/useJsonContext.js`（300ms 去抖的筛选执行）、`src/views/JsonToJsPage.vue`、`src/components/layout/*`。
- 入口与构建：`src/main.js`、`src/router/index.js`、`background.js`、`manifest.json`（`storage`/`activeTab`/`tabs` 权限）、`vite.config.js`、`scripts/build-extension.js`（`npm run build:extension` 产出 `dist-extension`）。

## 执行模型

- 筛选执行链：`useJsonContext.executeFilter`（300ms 去抖）→ `executeFilterCode` → `executeFilterCodeSafely` → `analyzeFilterCode`（正则取字段/路径）→ `executeSpecifiedLevelFilter` / `executeRecursiveFilter`；仓库中没有任何 `eval`/`new Function`（边界规则见领域上下文）。
- 输入 1MB 上限与输入历史最多 10 条由 store 校验和 `setInputJson` 维护；校验、解析、执行失败分别进 `parseErrors`/`transformErrors`，不抛出到组件。
- 筛选配置：`method`（`specified`/`recursive`）、`outputFormat`（`object`/`grouped`）、`listPath`、`selectedKeys`、`autoExecute`，以及 `advanced`（`deduplication` 去重字段、`fieldFilters` 条件：contains/equals/startsWith/endsWith/regex）。
- 字段路径、两种筛选方式与输出格式的语义见 [json-field-filtering 领域上下文](../../requirements/contexts/json-field-filtering.md)。

## 验证入口

- `npm run build`、`npm run build:extension`；`npm run format`（prettier）。仓库没有自动化测试。
