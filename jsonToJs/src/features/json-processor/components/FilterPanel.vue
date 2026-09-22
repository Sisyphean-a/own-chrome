<template>
  <div class="filter-panel">
    <v-card
      class="filter-card"
      elevation="2"
    >
      <v-card-text class="filter-content">
        <!-- 筛选配置区域 -->
        <div class="filter-config-section">
          <div class="config-row">
            <span class="config-label">筛选</span>
            <v-btn-toggle
              v-model="methodToggle"
              mandatory
              density="compact"
              color="primary"
              class="config-toggle"
            >
              <v-btn
                value="specified"
                size="small"
              >
                指定
              </v-btn>
              <v-btn
                value="recursive"
                size="small"
              >
                递归
              </v-btn>
            </v-btn-toggle>

            <span class="config-label">格式</span>
            <v-btn-toggle
              v-model="formatToggle"
              mandatory
              density="compact"
              color="primary"
              class="config-toggle"
            >
              <v-btn
                value="object"
                size="small"
              >
                对象
              </v-btn>
              <v-btn
                value="grouped"
                size="small"
              >
                分组
              </v-btn>
            </v-btn-toggle>
          </div>
        </div>

        <!-- 数组路径配置 (仅指定层级筛选时显示) -->
        <v-row
          v-if="localFilterConfig.method === 'specified'"
          dense
          class="array-path-section"
        >
          <v-col cols="auto">
            <span class="config-label">路径</span>
          </v-col>
          <v-col
            cols="auto"
            style="min-width: 200px"
          >
            <v-text-field
              v-model="localFilterConfig.listPath"
              @update:model-value="updateListPath"
              placeholder="$"
              density="compact"
              variant="outlined"
              hide-details
              class="compact-input"
            ></v-text-field>
          </v-col>
        </v-row>

        <!-- 智能推荐 -->
        <div
          v-if="
            localFilterConfig.method === 'specified' &&
            smartRecommendation &&
            smartRecommendation.suggestedPaths.length > 1
          "
          class="path-suggestions"
        >
          <div class="suggestion-label">推荐路径：</div>
          <div class="suggestion-chips">
            <div
              v-for="path in smartRecommendation.suggestedPaths"
              :key="path"
              @click="selectSuggestedPath(path)"
              class="suggestion-chip"
            >
              {{ path }}
            </div>
          </div>
        </div>

        <!-- 高级筛选选项 -->
        <v-expansion-panels
          v-model="advancedPanel"
          variant="accordion"
          class="advanced-panel"
        >
          <v-expansion-panel>
            <v-expansion-panel-title>
              <span class="advanced-title">高级选项</span>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <!-- 去重配置 -->
              <div class="advanced-option">
                <v-checkbox
                  v-model="localFilterConfig.advanced.deduplication.enabled"
                  @update:model-value="updateAdvancedConfig"
                  label="结果去重"
                  density="compact"
                  hide-details
                />
                <v-select
                  v-if="localFilterConfig.advanced.deduplication.enabled"
                  v-model="localFilterConfig.advanced.deduplication.fields"
                  @update:model-value="updateAdvancedConfig"
                  :items="localFilterConfig.selectedKeys"
                  label="选择需要去重的字段"
                  multiple
                  chips
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="mt-2"
                />
              </div>

              <!-- 字段过滤 -->
              <div class="advanced-option">
                <div class="filter-header">
                  <span class="filter-label">字段过滤条件</span>
                  <v-btn
                    @click="addFieldFilter"
                    size="small"
                    variant="outlined"
                    color="primary"
                    class="btn-compact"
                  >
                    添加条件
                  </v-btn>
                </div>

                <div
                  v-for="(filter, index) in localFilterConfig.advanced.fieldFilters"
                  :key="index"
                  class="filter-row"
                >
                  <v-select
                    v-model="filter.field"
                    @update:model-value="updateAdvancedConfig"
                    :items="localFilterConfig.selectedKeys"
                    label="字段"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="filter-field"
                  />
                  <v-select
                    v-model="filter.type"
                    @update:model-value="updateAdvancedConfig"
                    :items="filterTypes"
                    label="条件"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="filter-type"
                  />
                  <v-text-field
                    v-model="filter.value"
                    @update:model-value="updateAdvancedConfig"
                    label="值"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="filter-value"
                  />
                  <v-checkbox
                    v-model="filter.caseSensitive"
                    @update:model-value="updateAdvancedConfig"
                    label="区分大小写"
                    density="compact"
                    hide-details
                    class="filter-case"
                  />
                  <v-btn
                    @click="removeFieldFilter(index)"
                    icon
                    size="small"
                    variant="text"
                    color="error"
                    class="btn-icon"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- 已选字段管理 -->
        <div class="selected-fields-section">
          <!-- 字段列表 -->
          <div class="fields-list">
            <div
              v-for="field in localFilterConfig.selectedKeys"
              :key="field"
              class="field-tag"
            >
              <span class="field-name">{{ field }}</span>
              <button
                @click="removeField(field)"
                class="field-remove"
                type="button"
              >
                ×
              </button>
            </div>
            <!-- 清空按钮 -->
            <button
              v-if="localFilterConfig.selectedKeys.length > 0"
              @click="clearAllFields"
              class="clear-all-btn"
              type="button"
              title="清空所有字段"
            >
              🗑️
            </button>
          </div>

          <!-- 手动添加字段 -->
          <div class="manual-add-section">
            <v-text-field
              v-model="newFieldName"
              @keyup.enter="addManualField"
              placeholder="手动输入字段名"
              density="compact"
              variant="outlined"
              hide-details
              class="compact-input"
            >
              <template #append-inner>
                <v-btn
                  @click="addManualField"
                  :disabled="!newFieldName.trim()"
                  size="small"
                  variant="text"
                  icon="mdi-plus"
                  density="compact"
                  class="btn-inline"
                ></v-btn>
              </template>
            </v-text-field>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { useJsonContext } from '../composables/useJsonContext.js'
import { analyzeJsonStructure } from '@/shared/utils/filterUtils.js'

// 使用JSON上下文
const { jsonState, updateFilterConfig, addSelectedKey, removeSelectedKey, clearSelectedKeys } =
  useJsonContext()

// 本地状态
const localFilterConfig = reactive({
  method: jsonState.filterConfig.method,
  outputFormat: jsonState.filterConfig.outputFormat,
  listPath: jsonState.filterConfig.listPath,
  selectedKeys: [...jsonState.filterConfig.selectedKeys],
  advanced: {
    deduplication: {
      enabled: jsonState.filterConfig.advanced.deduplication.enabled,
      fields: [...jsonState.filterConfig.advanced.deduplication.fields],
    },
    fieldFilters: [...jsonState.filterConfig.advanced.fieldFilters.map((f) => ({ ...f }))],
  },
})

const newFieldName = ref('')

// 高级选项相关
const advancedPanel = ref([]) // 控制折叠面板展开状态
const filterTypes = [
  { title: '包含', value: 'contains' },
  { title: '等于', value: 'equals' },
  { title: '开头是', value: 'startsWith' },
  { title: '结尾是', value: 'endsWith' },
  { title: '正则表达式', value: 'regex' },
]

// 智能推荐
const smartRecommendation = computed(() => {
  if (jsonState.parsedJson) {
    return analyzeJsonStructure(jsonState.parsedJson)
  }
  return null
})

// 按钮组状态 - 直接使用computed，简化逻辑
const methodToggle = computed({
  get: () => localFilterConfig.method,
  set: (value) => {
    localFilterConfig.method = value
    updateFilterConfig({ method: value })
  },
})

const formatToggle = computed({
  get: () => localFilterConfig.outputFormat,
  set: (value) => {
    localFilterConfig.outputFormat = value
    updateFilterConfig({ outputFormat: value })
  },
})

// 监听store状态变化，同步到本地状态
watch(
  () => jsonState.filterConfig,
  (newConfig) => {
    localFilterConfig.method = newConfig.method
    localFilterConfig.outputFormat = newConfig.outputFormat
    localFilterConfig.listPath = newConfig.listPath
    localFilterConfig.selectedKeys = [...newConfig.selectedKeys]
    localFilterConfig.advanced = {
      deduplication: {
        enabled: newConfig.advanced.deduplication.enabled,
        fields: [...newConfig.advanced.deduplication.fields],
      },
      fieldFilters: [...newConfig.advanced.fieldFilters.map((f) => ({ ...f }))],
    }
  },
  { deep: true }
)

// 监听智能推荐变化，自动应用推荐配置
watch(
  smartRecommendation,
  (recommendation) => {
    if (recommendation && jsonState.filterConfig.selectedKeys.length === 0) {
      // 只在没有选择字段时自动应用推荐
      updateFilterConfig({
        method: recommendation.method,
        listPath: recommendation.suggestedPaths[0] || 'json',
      })
    }
  },
  { immediate: true }
)

// 这些函数已经不需要了，因为使用了computed的setter

// 更新数组路径
const updateListPath = (listPath) => {
  updateFilterConfig({ listPath })
}

// 添加手动输入的字段
const addManualField = () => {
  const fieldName = newFieldName.value.trim()
  if (fieldName && !localFilterConfig.selectedKeys.includes(fieldName)) {
    addSelectedKey(fieldName)
    newFieldName.value = ''
  }
}

// 移除字段
const removeField = (field) => {
  removeSelectedKey(field)
}

// 清空所有字段
const clearAllFields = () => {
  clearSelectedKeys()
}

// 选择推荐路径
const selectSuggestedPath = (path) => {
  updateFilterConfig({ listPath: path })
}

// 高级选项相关方法
const updateAdvancedConfig = () => {
  updateFilterConfig({
    advanced: {
      deduplication: {
        enabled: localFilterConfig.advanced.deduplication.enabled,
        fields: [...localFilterConfig.advanced.deduplication.fields],
      },
      fieldFilters: [...localFilterConfig.advanced.fieldFilters.map((f) => ({ ...f }))],
    },
  })
}

const addFieldFilter = () => {
  localFilterConfig.advanced.fieldFilters.push({
    field: localFilterConfig.selectedKeys[0] || '',
    type: 'contains',
    value: '',
    caseSensitive: false,
  })
  updateAdvancedConfig()
}

const removeFieldFilter = (index) => {
  localFilterConfig.advanced.fieldFilters.splice(index, 1)
  updateAdvancedConfig()
}

// 定义事件
defineEmits(['field-added', 'field-removed', 'config-changed'])
</script>

<style lang="scss" scoped>
.filter-panel {
  padding: 4px;
}

.filter-card {
  border-radius: 8px;
}

.filter-content {
  padding: 16px;
}

.filter-config-section {
  margin-bottom: 16px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  /* 防止子元素过度拉伸 */
  > * {
    flex-shrink: 0;
  }
}

.array-path-section {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
  min-width: fit-content;
  margin-right: 8px;
  padding: 4px 0;

  /* 添加一些视觉层次 */
  position: relative;

  &::after {
    content: ':';
    margin-left: 2px;
    color: #9ca3af;
  }
}

.config-toggle {
  /* 确保v-btn-toggle正确显示 */
  display: inline-flex !important;
  width: auto !important;

  .v-btn-group {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
    border-radius: 6px !important;
    width: auto !important;
    overflow: hidden;
  }

  .v-btn {
    min-width: 48px !important;
    max-width: 80px !important;
    width: auto !important;
    height: 32px !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    flex: none !important;
    border-radius: 0 !important;
    text-transform: none !important;
    letter-spacing: 0 !important;

    /* 未选中状态 */
    background-color: #f9fafb !important;
    color: #6b7280 !important;
    border: 1px solid #e5e7eb !important;

    &:hover:not(.v-btn--active) {
      background-color: #f3f4f6 !important;
      color: #374151 !important;
    }

    /* 选中状态 */
    &.v-btn--active {
      background-color: #3b82f6 !important;
      color: white !important;
      border-color: #3b82f6 !important;
      box-shadow: 0 1px 2px rgba(59, 130, 246, 0.2) !important;
      z-index: 1;
      position: relative;
    }

    /* 第一个按钮 */
    &:first-child {
      border-top-left-radius: 6px !important;
      border-bottom-left-radius: 6px !important;
    }

    /* 最后一个按钮 */
    &:last-child {
      border-top-right-radius: 6px !important;
      border-bottom-right-radius: 6px !important;
    }

    /* 中间按钮的边框处理 */
    &:not(:first-child) {
      border-left: none !important;
    }

    &.v-btn--active + .v-btn {
      border-left: 1px solid #3b82f6 !important;
    }
  }
}

.selected-fields-section {
  margin-bottom: 8px;
}

.fields-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
  min-height: 24px;
  padding: 4px;
  border: 1px dashed #ddd;
  border-radius: 4px;
  background: #f9f9f9;
  align-items: flex-start;
}

.field-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  background-color: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 10px;
  font-size: 11px;
  color: #333;
  flex-shrink: 0;
  max-width: 200px;
}

.field-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  font-weight: 500;
}

.field-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: #bbdefb;
  border-radius: 50%;
  color: #f44336;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  flex-shrink: 0;
  transition: all 0.2s ease;

  &:hover {
    background: #ffcdd2;
    transform: scale(1.1);
  }
}

.clear-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: #ffebee;
  border-radius: 50%;
  color: #f44336;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  flex-shrink: 0;
  transition: all 0.2s ease;
  margin-left: auto;

  &:hover {
    background: #ffcdd2;
    transform: scale(1.1);
  }
}

.compact-input {
  :deep(.v-field) {
    min-height: 28px !important;

    .v-field__input {
      min-height: 28px !important;
      padding-top: 4px !important;
      padding-bottom: 4px !important;
    }

    .v-field__append-inner {
      padding-top: 4px !important;
      padding-bottom: 4px !important;
    }
  }
}

.manual-add-section {
  margin-top: 8px;
}

.path-suggestions {
  margin-top: 12px;
  margin-bottom: 12px;

  .suggestion-label {
    font-size: 11px;
    color: #666;
    margin-bottom: 6px;
    font-weight: 500;
  }

  .suggestion-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .suggestion-chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    background-color: #f0f8ff;
    border: 1px solid #b3d9ff;
    border-radius: 10px;
    font-size: 11px;
    color: #0066cc;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
      background-color: #e6f3ff;
      border-color: #80bfff;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 102, 204, 0.1);
    }

    &:active {
      transform: translateY(0);
      background-color: #cce7ff;
    }
  }
}

/* 统一按钮样式已移至全局 components.css */

/* 高级选项样式 */
.advanced-panel {
  margin-top: 12px;
  margin-bottom: 12px;
}

.advanced-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.advanced-option {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.filter-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.filter-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap; /* 防止文字换行 */
}

/* 使用统一按钮样式系统后，不再需要单独的按钮样式 */

.filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1.5fr auto auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.filter-field,
.filter-type,
.filter-value {
  min-width: 0;
}

.filter-case {
  font-size: 11px;
  white-space: nowrap;
}

/* filter-remove 样式已合并到全局 btn-icon */

/* 响应式调整 */
@media (max-width: 768px) {
  .filter-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}

/* 按钮样式内联 */
/* 基础按钮样式 - 所有自定义按钮的基础 */
/* 紧凑按钮 - 用于空间有限的地方 */
.btn-compact {
  min-width: auto !important;
  width: auto !important;
  flex-shrink: 0;
  height: 28px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.btn-compact :deep(.v-btn__content) {
  white-space: nowrap;
}

/* 图标按钮 - 只有图标的按钮 */
.btn-icon {
  min-width: 28px !important;
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  flex-shrink: 0;
  font-size: 12px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.btn-icon :deep(.v-btn__content) {
  white-space: nowrap;
}

/* 内联按钮 - 在文本或输入框内的按钮 */
.btn-inline {
  min-width: auto !important;
  width: auto !important;
  height: 24px !important;
  padding: 0 8px !important;
  flex-shrink: 0;
  font-size: 11px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.btn-inline :deep(.v-btn__content) {
  white-space: nowrap;
}
</style>
