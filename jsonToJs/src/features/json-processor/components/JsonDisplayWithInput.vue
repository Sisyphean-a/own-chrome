<template>
  <div class="json-display-with-input">
    <!-- 上部分：JSON展示区域 (自适应剩余空间) -->
    <div class="json-display-area">
      <json-view
        :json="jsonState.parsedJson"
        click-mode="filter"
        @field-click="handleFieldClick"
      />
    </div>

    <!-- 下部分：输入区域和筛选面板 (内容自适应高度) -->
    <div class="bottom-area">
      <!-- 输入区域 -->
      <div class="input-section">
        <div class="input-container">
          <v-text-field
            v-model="localJsonInput"
            label="输入JSON数据"
            variant="outlined"
            density="compact"
            hide-details
            @input="handleInput"
            :error="hasError"
            :error-messages="hasError ? '解析错误' : ''"
            class="json-input-field"
          />
          <v-btn
            size="small"
            variant="outlined"
            color="primary"
            class="btn-standard"
            @click="readFromClipboard"
            :loading="isReadingClipboard"
            :disabled="isReadingClipboard"
            title="读取剪切板"
          >
            读取剪切板
          </v-btn>
        </div>
      </div>

      <!-- 筛选面板 -->
      <div class="filter-section">
        <filter-panel @field-click="handleFieldClick" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useJsonContext } from '../composables/useJsonContext.js'
import JsonView from './JsonView.vue'
import FilterPanel from './FilterPanel.vue'

// 使用JSON上下文，不再需要props和emits
const { jsonState, updateJsonInput, addSelectedKey } = useJsonContext()

// 本地状态只管理UI相关的
const localJsonInput = ref('')
const isReadingClipboard = ref(false)

// 监听context状态变化
watch(
  () => jsonState.inputJson,
  (newVal) => {
    if (newVal !== localJsonInput.value) {
      localJsonInput.value = newVal
    }
  },
  { immediate: true }
)

// 计算是否有错误
const hasError = computed(() => jsonState.parseErrors.length > 0)

// 处理输入变化
const handleInput = () => {
  // 使用context更新JSON输入
  updateJsonInput(localJsonInput.value)
}

// 处理字段点击事件
const handleFieldClick = (fieldName) => {
  addSelectedKey(fieldName)
}

// 读取剪切板内容
const readFromClipboard = async () => {
  if (!navigator.clipboard) {
    console.warn('剪切板API不可用')
    return
  }

  try {
    isReadingClipboard.value = true
    const text = await navigator.clipboard.readText()

    if (text.trim()) {
      localJsonInput.value = text.trim()
      handleInput()
    }
  } catch (error) {
    console.error('读取剪切板失败:', error)
    // 可以在这里添加用户提示
  } finally {
    isReadingClipboard.value = false
  }
}
</script>

<style lang="scss" scoped>
.json-display-with-input {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.json-display-area {
  flex: 1; /* 占据剩余所有空间 */
  overflow: auto;
  min-height: 0;
  position: relative;
}

.bottom-area {
  flex: 0 0 auto; /* 不伸缩，高度完全由内容决定 */
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
  max-height: 60vh; /* 防止下方区域过高，最大占屏60% */
  overflow: hidden;
  position: relative;
  z-index: 10;
}

.input-section {
  flex-shrink: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.filter-section {
  flex: 0 0 auto; /* 改为 auto，不让它自动撑满父容器 */
  overflow-y: auto;
  min-height: 0;
  max-height: 100%;
}

.input-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
}

.json-input-field {
  flex: 1;
  min-width: 0;

  :deep(.v-field__input) {
    min-height: 24px;
    padding-top: 6px;
    padding-bottom: 6px;
  }
}

/* 按钮样式内联 */
.btn-standard {
  min-width: auto !important;
  width: auto !important;
  flex-shrink: 0;
  height: 32px !important;
  padding: 0 16px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.btn-standard :deep(.v-btn__content) {
  white-space: nowrap;
}
</style>
