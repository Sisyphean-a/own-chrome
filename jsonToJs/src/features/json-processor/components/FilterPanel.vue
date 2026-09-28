<template>
  <div class="filter-panel">
    <div class="panel-heading">
      <div>
        <span class="step">02 / CONFIGURE</span>
        <h2>筛选设置</h2>
        <p>从左侧预览点击字段，或在下方手动添加。</p>
      </div>
      <span class="field-count">{{ localFilterConfig.selectedKeys.length }} 个字段</span>
    </div>

    <div class="settings-grid">
      <div class="setting">
        <span class="setting-label">筛选方式</span>
        <v-btn-toggle v-model="methodToggle" mandatory density="compact" color="primary" variant="outlined" aria-label="筛选方式">
          <v-btn value="specified" size="small">指定路径</v-btn>
          <v-btn value="recursive" size="small">递归查找</v-btn>
        </v-btn-toggle>
      </div>
      <div class="setting">
        <span class="setting-label">输出格式</span>
        <v-btn-toggle v-model="formatToggle" mandatory density="compact" color="primary" variant="outlined" aria-label="输出格式">
          <v-btn value="object" size="small">对象</v-btn>
          <v-btn value="grouped" size="small">按字段分组</v-btn>
        </v-btn-toggle>
      </div>
    </div>

    <div v-if="localFilterConfig.method === 'specified'" class="path-setting">
      <label for="list-path" class="setting-label">数组路径</label>
      <v-text-field
        id="list-path"
        v-model="localFilterConfig.listPath"
        @update:model-value="updateListPath"
        placeholder="$"
        density="compact"
        variant="outlined"
        hide-details
      />
      <div v-if="smartRecommendation && smartRecommendation.suggestedPaths.length > 1" class="path-suggestions">
        <span>推荐路径</span>
        <button
          v-for="path in smartRecommendation.suggestedPaths"
          :key="path"
          type="button"
          class="path-chip"
          @click="selectSuggestedPath(path)"
        >{{ path }}</button>
      </div>
    </div>

    <div class="fields-section">
      <div class="fields-heading">
        <span class="setting-label">已选字段</span>
        <button v-if="localFilterConfig.selectedKeys.length" type="button" class="text-action" @click="clearAllFields">清空全部</button>
      </div>
      <div class="fields-list" aria-live="polite">
        <span v-if="!localFilterConfig.selectedKeys.length" class="fields-empty">尚未选择字段</span>
        <span v-for="field in localFilterConfig.selectedKeys" :key="field" class="field-tag">
          <span class="field-name" :title="field">{{ field }}</span>
          <button type="button" class="field-remove" :aria-label="`移除字段 ${field}`" @click="removeField(field)">×</button>
        </span>
      </div>
      <div class="manual-add-section">
        <v-text-field
          v-model="newFieldName"
          @keyup.enter="addManualField"
          placeholder="输入字段名，按 Enter 添加"
          aria-label="手动添加字段名"
          density="compact"
          variant="outlined"
          hide-details
        />
        <v-btn variant="outlined" color="primary" size="small" :disabled="!newFieldName.trim()" @click="addManualField">添加</v-btn>
      </div>
    </div>

    <v-expansion-panels v-model="advancedPanel" variant="accordion" class="advanced-panel">
      <v-expansion-panel elevation="0">
        <v-expansion-panel-title>高级选项 <span class="advanced-hint">去重与条件过滤</span></v-expansion-panel-title>
        <v-expansion-panel-text>
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
            />
          </div>
          <div class="advanced-option">
            <div class="filter-header">
              <span class="setting-label">字段过滤条件</span>
              <v-btn @click="addFieldFilter" size="small" variant="outlined" color="primary">添加条件</v-btn>
            </div>
            <div v-for="(filter, index) in localFilterConfig.advanced.fieldFilters" :key="index" class="filter-row">
              <v-select v-model="filter.field" @update:model-value="updateAdvancedConfig" :items="localFilterConfig.selectedKeys" label="字段" density="compact" variant="outlined" hide-details />
              <v-select v-model="filter.type" @update:model-value="updateAdvancedConfig" :items="filterTypes" label="条件" density="compact" variant="outlined" hide-details />
              <v-text-field v-model="filter.value" @update:model-value="updateAdvancedConfig" label="值" density="compact" variant="outlined" hide-details />
              <v-checkbox v-model="filter.caseSensitive" @update:model-value="updateAdvancedConfig" label="区分大小写" density="compact" hide-details />
              <v-btn @click="removeFieldFilter(index)" icon="mdi-delete-outline" size="small" variant="text" color="error" :aria-label="`删除第 ${index + 1} 条过滤条件`" />
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { useJsonContext } from '../composables/useJsonContext.js'
import { analyzeJsonStructure } from '@/shared/utils/filterUtils.js'

const { jsonState, updateFilterConfig, addSelectedKey, removeSelectedKey, clearSelectedKeys } = useJsonContext()
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
const advancedPanel = ref([])
const filterTypes = [
  { title: '包含', value: 'contains' },
  { title: '等于', value: 'equals' },
  { title: '开头是', value: 'startsWith' },
  { title: '结尾是', value: 'endsWith' },
  { title: '正则表达式', value: 'regex' },
]
const smartRecommendation = computed(() => jsonState.parsedJson ? analyzeJsonStructure(jsonState.parsedJson) : null)
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
watch(
  smartRecommendation,
  (recommendation) => {
    if (recommendation && jsonState.filterConfig.selectedKeys.length === 0) {
      updateFilterConfig({
        method: recommendation.method,
        listPath: recommendation.suggestedPaths[0] || 'json',
      })
    }
  },
  { immediate: true }
)
const updateListPath = (listPath) => updateFilterConfig({ listPath })
const addManualField = () => {
  const fieldName = newFieldName.value.trim()
  if (fieldName && !localFilterConfig.selectedKeys.includes(fieldName)) {
    addSelectedKey(fieldName)
    newFieldName.value = ''
  }
}
const removeField = (field) => removeSelectedKey(field)
const clearAllFields = () => clearSelectedKeys()
const selectSuggestedPath = (path) => updateFilterConfig({ listPath: path })
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
</script>

<style lang="scss" scoped>
.filter-panel { padding: 18px 22px 0; }
.panel-heading, .fields-heading, .filter-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.panel-heading { margin-bottom: 18px; }
.step { font-size: 10px; font-weight: 700; letter-spacing: .14em; color: #2563eb; }
h2 { margin-top: 3px; font-size: 17px; font-weight: 700; }
p { margin-top: 3px; font-size: 12px; color: var(--text-secondary); }
.field-count { flex: none; padding: 5px 10px; border-radius: 20px; background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 600; }
.settings-grid { display: flex; flex-wrap: wrap; gap: 16px 24px; margin-bottom: 16px; }
.setting { display: flex; flex-direction: column; align-items: flex-start; gap: 7px; }
.setting-label { display: block; font-size: 12px; font-weight: 600; color: #334155; }
:deep(.v-btn) { text-transform: none; letter-spacing: 0; }
:deep(.v-btn-toggle) { border: 1px solid #d4deea; border-radius: 7px; overflow: hidden; }
:deep(.v-btn-toggle .v-btn) { font-size: 12px; }
.path-setting { margin-bottom: 16px; }
.path-setting > .setting-label { margin-bottom: 7px; }
.path-suggestions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; font-size: 11px; color: var(--text-secondary); }
.path-chip { max-width: 100%; padding: 4px 9px; border: 1px solid #bfdbfe; border-radius: 5px; background: #eff6ff; color: #1d4ed8; cursor: pointer; overflow-wrap: anywhere; }
.path-chip:hover { background: #dbeafe; }
.fields-section { padding-top: 14px; border-top: 1px solid #e2e8f0; }
.fields-heading { margin-bottom: 9px; }
.text-action { border: 0; background: transparent; color: #2563eb; font-size: 12px; cursor: pointer; }
.text-action:hover { text-decoration: underline; }
.fields-list { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; min-height: 42px; padding: 8px; border: 1px dashed #cbd5e1; border-radius: 7px; background: #f8fafc; }
.fields-empty { color: var(--text-secondary); font-size: 12px; }
.field-tag { display: inline-flex; align-items: center; max-width: 100%; padding: 3px 4px 3px 9px; gap: 6px; border: 1px solid #bfdbfe; border-radius: 5px; background: #eff6ff; color: #1e40af; font: 12px var(--font-family-mono); }
.field-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.field-remove { display: grid; place-items: center; width: 24px; height: 24px; border: 0; border-radius: 4px; background: transparent; color: #1e40af; cursor: pointer; font-size: 17px; }
.field-remove:hover { background: #dbeafe; }
.manual-add-section { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.manual-add-section .v-input { min-width: 0; }
.advanced-panel { margin-top: 16px; border-top: 1px solid #e2e8f0; }
:deep(.v-expansion-panel-title) { padding: 13px 0; min-height: 48px; font-size: 12px; font-weight: 600; }
:deep(.v-expansion-panel-text__wrapper) { padding: 4px 0 16px; }
.advanced-hint { margin-left: 8px; color: var(--text-secondary); font-weight: 400; }
.advanced-option + .advanced-option { margin-top: 16px; }
.filter-header { margin-bottom: 10px; }
.filter-row { display: grid; grid-template-columns: minmax(100px, 1fr) minmax(100px, 1fr) minmax(120px, 1.2fr) auto auto; align-items: center; gap: 8px; margin: 8px 0; padding: 10px; border-radius: 8px; background: #f8fafc; }
.filter-row > * { min-width: 0; }
button:focus-visible, :deep(.v-btn:focus-visible) { outline: 2px solid #2563eb; outline-offset: 2px; }
@media (max-width: 600px) {
  .filter-panel { padding: 16px 16px 0; }
  .filter-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .filter-row > :nth-child(3) { grid-column: 1 / -1; }
}
</style>
