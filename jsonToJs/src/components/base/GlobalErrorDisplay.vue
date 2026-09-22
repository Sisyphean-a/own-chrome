<template>
  <teleport to="body">
    <div
      v-if="hasErrors"
      class="global-error-container"
      :class="containerClasses"
    >
      <transition-group
        name="error-item"
        tag="div"
        class="error-list"
      >
        <div
          v-for="error in visibleErrors"
          :key="error.id"
          class="error-item"
          :class="getErrorClasses(error)"
        >
          <div class="error-content">
            <div class="error-header">
              <div class="error-icon">
                <v-icon
                  :icon="getErrorIcon(error)"
                  :color="getErrorColor(error)"
                  size="18"
                />
              </div>
              <div class="error-info">
                <div class="error-title">{{ getErrorTitle(error) }}</div>
                <div class="error-context">{{ error.context }}</div>
              </div>
              <div class="error-actions">
                <button
                  class="error-action-btn"
                  @click="toggleDetails(error.id)"
                  :title="showDetails[error.id] ? '隐藏详情' : '显示详情'"
                >
                  <v-icon
                    :icon="showDetails[error.id] ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    size="16"
                  />
                </button>
                <button
                  class="error-action-btn error-close-btn"
                  @click="removeError(error.id)"
                  title="关闭"
                >
                  <v-icon
                    icon="mdi-close"
                    size="16"
                  />
                </button>
              </div>
            </div>

            <div class="error-message">{{ error.message }}</div>

            <transition name="error-details">
              <div
                v-if="showDetails[error.id]"
                class="error-details"
              >
                <div class="error-detail-item">
                  <strong>时间:</strong> {{ formatTime(error.timestamp) }}
                </div>
                <div class="error-detail-item"><strong>类型:</strong> {{ error.type }}</div>
                <div class="error-detail-item"><strong>严重程度:</strong> {{ error.severity }}</div>
                <div
                  v-if="error.stack"
                  class="error-detail-item"
                >
                  <strong>堆栈信息:</strong>
                  <pre class="error-stack">{{ error.stack }}</pre>
                </div>
                <div
                  v-if="error.metadata && Object.keys(error.metadata).length"
                  class="error-detail-item"
                >
                  <strong>元数据:</strong>
                  <pre class="error-metadata">{{ JSON.stringify(error.metadata, null, 2) }}</pre>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </transition-group>

      <div
        v-if="hasMoreErrors"
        class="error-summary"
      >
        <span>还有 {{ hiddenErrorsCount }} 个错误未显示</span>
        <button
          class="error-action-btn"
          @click="showAllErrors = !showAllErrors"
        >
          {{ showAllErrors ? '收起' : '显示全部' }}
        </button>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useGlobalErrors } from '@/shared/composables/useErrorHandler.js'
import { ERROR_CONFIG } from '@/shared/constants/app-config.js'

const props = defineProps({
  position: {
    type: String,
    default: 'top-right',
    validator: (value) => ['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(value),
  },
  maxVisible: {
    type: Number,
    default: 3,
  },
  showStack: {
    type: Boolean,
    default: false,
  },
})

// 使用全局错误状态
const { globalErrors, clearGlobalErrors } = useGlobalErrors()

// 本地状态
const showDetails = reactive({})
const showAllErrors = ref(false)

// 计算属性
const hasErrors = computed(() => globalErrors.value.length > 0)

const visibleErrors = computed(() => {
  if (showAllErrors.value) {
    return globalErrors.value
  }
  return globalErrors.value.slice(-props.maxVisible)
})

const hasMoreErrors = computed(() => {
  return globalErrors.value.length > props.maxVisible && !showAllErrors.value
})

const hiddenErrorsCount = computed(() => {
  return Math.max(0, globalErrors.value.length - props.maxVisible)
})

const containerClasses = computed(() => {
  return ['global-error-container', `global-error-container--${props.position}`]
})

// 方法
const getErrorIcon = (error) => {
  switch (error.type) {
    case ERROR_CONFIG.types.PARSE_ERROR:
      return 'mdi-code-braces'
    case ERROR_CONFIG.types.EXECUTION_ERROR:
      return 'mdi-alert-circle'
    case ERROR_CONFIG.types.NETWORK_ERROR:
      return 'mdi-wifi-off'
    case ERROR_CONFIG.types.VALIDATION_ERROR:
      return 'mdi-alert'
    default:
      return 'mdi-alert-circle'
  }
}

const getErrorColor = (error) => {
  switch (error.severity) {
    case 'high':
      return 'error'
    case 'medium':
      return 'warning'
    case 'low':
      return 'info'
    default:
      return 'warning'
  }
}

const getErrorTitle = (error) => {
  switch (error.type) {
    case ERROR_CONFIG.types.PARSE_ERROR:
      return '解析错误'
    case ERROR_CONFIG.types.EXECUTION_ERROR:
      return '执行错误'
    case ERROR_CONFIG.types.NETWORK_ERROR:
      return '网络错误'
    case ERROR_CONFIG.types.VALIDATION_ERROR:
      return '验证错误'
    default:
      return '未知错误'
  }
}

const getErrorClasses = (error) => {
  return [
    'error-item',
    `error-item--${error.severity}`,
    `error-item--${error.type.toLowerCase().replace('_', '-')}`,
  ]
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

const toggleDetails = (errorId) => {
  showDetails[errorId] = !showDetails[errorId]
}

const removeError = (errorId) => {
  // 从全局错误中移除
  const index = globalErrors.value.findIndex((error) => error.id === errorId)
  if (index !== -1) {
    globalErrors.value.splice(index, 1)
  }

  // 清理详情显示状态
  delete showDetails[errorId]
}

const clearAllErrors = () => {
  clearGlobalErrors()
  Object.keys(showDetails).forEach((key) => {
    delete showDetails[key]
  })
  showAllErrors.value = false
}

// 暴露方法给父组件
defineExpose({
  clearAllErrors,
  removeError,
})
</script>

<style lang="scss" scoped>
.global-error-container {
  position: fixed;
  z-index: var(--z-modal, 1000);
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  pointer-events: none;

  &--top-right {
    top: var(--spacing-lg, 16px);
    right: var(--spacing-lg, 16px);
  }

  &--top-left {
    top: var(--spacing-lg, 16px);
    left: var(--spacing-lg, 16px);
  }

  &--bottom-right {
    bottom: var(--spacing-lg, 16px);
    right: var(--spacing-lg, 16px);
  }

  &--bottom-left {
    bottom: var(--spacing-lg, 16px);
    left: var(--spacing-lg, 16px);
  }
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.error-item {
  background: var(--bg-primary, white);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.15));
  border-left: 4px solid var(--color-error, #ef4444);
  pointer-events: auto;
  transition: all var(--transition-normal, 0.3s);

  &--high {
    border-left-color: var(--color-error, #ef4444);
  }

  &--medium {
    border-left-color: var(--color-warning, #f59e0b);
  }

  &--low {
    border-left-color: var(--color-info, #3b82f6);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl, 0 20px 40px rgba(0, 0, 0, 0.2));
  }
}

.error-content {
  padding: var(--spacing-md, 12px);
}

.error-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-sm, 8px);
}

.error-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.error-info {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
  font-size: var(--font-size-sm, 14px);
  margin-bottom: 2px;
}

.error-context {
  font-size: var(--font-size-xs, 12px);
  color: var(--text-secondary, #6b7280);
}

.error-actions {
  display: flex;
  gap: var(--spacing-xs, 4px);
  flex-shrink: 0;
}

.error-action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: var(--spacing-xs, 4px);
  border-radius: var(--radius-sm, 4px);
  color: var(--text-secondary, #6b7280);
  transition: all var(--transition-fast, 0.15s);

  &:hover {
    background: var(--bg-secondary, #f3f4f6);
    color: var(--text-primary, #1f2937);
  }

  &.error-close-btn:hover {
    background: var(--color-error-light, #fef2f2);
    color: var(--color-error, #ef4444);
  }
}

.error-message {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-primary, #1f2937);
  line-height: 1.4;
  margin-bottom: var(--spacing-sm, 8px);
}

.error-details {
  border-top: 1px solid var(--border-light, #e5e7eb);
  padding-top: var(--spacing-sm, 8px);
  margin-top: var(--spacing-sm, 8px);
}

.error-detail-item {
  margin-bottom: var(--spacing-xs, 4px);
  font-size: var(--font-size-xs, 12px);

  strong {
    color: var(--text-primary, #1f2937);
  }
}

.error-stack,
.error-metadata {
  background: var(--bg-secondary, #f3f4f6);
  padding: var(--spacing-sm, 8px);
  border-radius: var(--radius-sm, 4px);
  font-family: var(--font-family-mono, monospace);
  font-size: var(--font-size-xs, 11px);
  margin-top: var(--spacing-xs, 4px);
  overflow-x: auto;
  max-height: 150px;
  overflow-y: auto;
}

.error-summary {
  background: var(--bg-secondary, #f3f4f6);
  padding: var(--spacing-sm, 8px);
  border-radius: var(--radius-md, 8px);
  margin-top: var(--spacing-sm, 8px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs, 12px);
  color: var(--text-secondary, #6b7280);
  pointer-events: auto;
}

/* 动画 */
.error-item-enter-active,
.error-item-leave-active {
  transition: all 0.3s ease;
}

.error-item-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.error-item-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.error-details-enter-active,
.error-details-leave-active {
  transition: all 0.2s ease;
}

.error-details-enter-from,
.error-details-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  margin-top: 0;
}

/* 滚动条样式 */
.global-error-container::-webkit-scrollbar,
.error-stack::-webkit-scrollbar,
.error-metadata::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.global-error-container::-webkit-scrollbar-track,
.error-stack::-webkit-scrollbar-track,
.error-metadata::-webkit-scrollbar-track {
  background: transparent;
}

.global-error-container::-webkit-scrollbar-thumb,
.error-stack::-webkit-scrollbar-thumb,
.error-metadata::-webkit-scrollbar-thumb {
  background: var(--border-medium, #d1d5db);
  border-radius: 2px;
}

.global-error-container::-webkit-scrollbar-thumb:hover,
.error-stack::-webkit-scrollbar-thumb:hover,
.error-metadata::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary, #6b7280);
}
</style>
