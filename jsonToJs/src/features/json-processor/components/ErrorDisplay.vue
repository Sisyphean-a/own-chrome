<template>
  <transition name="error-fade">
    <div
      v-if="hasErrors"
      class="error-display"
      :class="errorClasses"
    >
      <div class="error-header">
        <div class="error-icon">
          <v-icon
            :icon="getErrorIcon(latestError)"
            :color="getErrorColor(latestError)"
            size="18"
          />
        </div>
        <div class="error-title">
          {{ getErrorTitle(latestError) }}
          <span
            v-if="errors.length > 1"
            class="error-count"
          >
            ({{ errors.length }} 个错误)
          </span>
        </div>
        <div class="error-actions">
          <button
            v-if="showDetails"
            class="error-action-btn"
            @click="toggleDetails"
            :title="isDetailsVisible ? '隐藏详情' : '显示详情'"
          >
            <v-icon
              :icon="isDetailsVisible ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              size="16"
            />
          </button>
          <button
            class="error-action-btn error-clear-btn"
            @click="clearAllErrors"
            title="清除所有错误"
          >
            <v-icon
              icon="mdi-close"
              size="16"
            />
          </button>
        </div>
      </div>

      <div class="error-content">
        <div class="error-message">
          {{ latestError?.message || '未知错误' }}
        </div>

        <transition name="error-details">
          <div
            v-if="isDetailsVisible && showDetails"
            class="error-details"
          >
            <!-- 错误列表 -->
            <div
              v-if="errors.length > 1"
              class="error-list"
            >
              <div class="error-list-title">所有错误:</div>
              <div
                v-for="(error, index) in errors"
                :key="error.id"
                class="error-list-item"
                :class="{ 'error-list-item--latest': index === errors.length - 1 }"
              >
                <div class="error-list-item-header">
                  <span class="error-list-item-index">{{ index + 1 }}.</span>
                  <span class="error-list-item-context">{{ error.context }}</span>
                  <span class="error-list-item-time">{{ formatTime(error.timestamp) }}</span>
                </div>
                <div class="error-list-item-message">{{ error.message }}</div>
              </div>
            </div>

            <!-- 详细信息 -->
            <div class="error-detail-info">
              <div class="error-detail-item">
                <strong>时间:</strong> {{ formatTime(latestError.timestamp) }}
              </div>
              <div class="error-detail-item"><strong>类型:</strong> {{ latestError.type }}</div>
              <div class="error-detail-item">
                <strong>上下文:</strong> {{ latestError.context }}
              </div>
              <div class="error-detail-item">
                <strong>严重程度:</strong>
                <span :class="`severity-${latestError.severity}`">
                  {{ getSeverityText(latestError.severity) }}
                </span>
              </div>

              <div
                v-if="latestError.stack && showStack"
                class="error-detail-item"
              >
                <strong>堆栈信息:</strong>
                <pre class="error-stack">{{ latestError.stack }}</pre>
              </div>

              <div
                v-if="latestError.metadata && Object.keys(latestError.metadata).length"
                class="error-detail-item"
              >
                <strong>元数据:</strong>
                <pre class="error-metadata">{{
                  JSON.stringify(latestError.metadata, null, 2)
                }}</pre>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ERROR_CONFIG } from '@/shared/constants/app-config.js'

const props = defineProps({
  errors: {
    type: Array,
    default: () => [],
  },
  showDetails: {
    type: Boolean,
    default: true,
  },
  showStack: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'compact', 'minimal'].includes(value),
  },
  maxHeight: {
    type: String,
    default: '200px',
  },
})

const emit = defineEmits(['clear', 'clear-all'])

// 本地状态
const isDetailsVisible = ref(false)

// 计算属性
const hasErrors = computed(() => props.errors.length > 0)
const latestError = computed(() => props.errors[props.errors.length - 1] || null)

const errorClasses = computed(() => {
  return [
    'error-display',
    `error-display--${props.variant}`,
    `error-display--${latestError.value?.severity || 'medium'}`,
  ]
})

// 方法
const getErrorIcon = (error) => {
  if (!error) return 'mdi-alert-circle'

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
  if (!error) return 'error'

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
  if (!error) return '错误'

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

const getSeverityText = (severity) => {
  switch (severity) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
    default:
      return '未知'
  }
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

const toggleDetails = () => {
  isDetailsVisible.value = !isDetailsVisible.value
}

const clearAllErrors = () => {
  isDetailsVisible.value = false
  emit('clear-all')
}

// 暴露方法给父组件
defineExpose({
  toggleDetails,
  clearAllErrors,
  isDetailsVisible,
})
</script>

<style lang="scss" scoped>
.error-display {
  background: var(--color-error-light, #fef2f2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  backdrop-filter: var(--backdrop-blur, blur(8px));
  transition: all var(--transition-normal, 0.3s);

  &--high {
    border-left: 4px solid var(--color-error, #ef4444);
  }

  &--medium {
    border-left: 4px solid var(--color-warning, #f59e0b);
  }

  &--low {
    border-left: 4px solid var(--color-info, #3b82f6);
  }

  &--compact {
    .error-header {
      padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
    }

    .error-content {
      padding: 0 var(--spacing-md, 12px) var(--spacing-sm, 8px);
    }
  }

  &--minimal {
    border: none;
    background: transparent;

    .error-header {
      padding: var(--spacing-xs, 4px) 0;
    }

    .error-content {
      padding: 0;
    }
  }
}

.error-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
  background: rgba(239, 68, 68, 0.05);
  border-bottom: 1px solid rgba(239, 68, 68, 0.1);
}

.error-icon {
  flex-shrink: 0;
}

.error-title {
  flex: 1;
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-error, #ef4444);
  font-size: var(--font-size-sm, 14px);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
}

.error-count {
  font-size: var(--font-size-xs, 12px);
  opacity: 0.8;
  font-weight: var(--font-weight-normal, 400);
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
  color: var(--color-error, #ef4444);
  transition: all var(--transition-fast, 0.15s);

  &:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  &.error-clear-btn:hover {
    background: var(--color-error, #ef4444);
    color: white;
  }
}

.error-content {
  padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
}

.error-message {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-primary, #1f2937);
  line-height: 1.4;
  font-family: var(--font-family-mono, monospace);
  white-space: pre-wrap;
}

.error-details {
  margin-top: var(--spacing-md, 12px);
  padding-top: var(--spacing-md, 12px);
  border-top: 1px solid rgba(239, 68, 68, 0.2);
}

.error-list {
  margin-bottom: var(--spacing-md, 12px);
}

.error-list-title {
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
  font-size: var(--font-size-sm, 14px);
  margin-bottom: var(--spacing-sm, 8px);
}

.error-list-item {
  padding: var(--spacing-sm, 8px);
  border-radius: var(--radius-sm, 4px);
  margin-bottom: var(--spacing-xs, 4px);
  background: rgba(239, 68, 68, 0.05);

  &--latest {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
}

.error-list-item-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-xs, 4px);
  font-size: var(--font-size-xs, 12px);
}

.error-list-item-index {
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-error, #ef4444);
}

.error-list-item-context {
  color: var(--text-secondary, #6b7280);
}

.error-list-item-time {
  margin-left: auto;
  color: var(--text-secondary, #6b7280);
}

.error-list-item-message {
  font-size: var(--font-size-xs, 12px);
  color: var(--text-primary, #1f2937);
  font-family: var(--font-family-mono, monospace);
}

.error-detail-info {
  font-size: var(--font-size-xs, 12px);
}

.error-detail-item {
  margin-bottom: var(--spacing-xs, 4px);

  strong {
    color: var(--text-primary, #1f2937);
  }
}

.severity-high {
  color: var(--color-error, #ef4444);
  font-weight: var(--font-weight-semibold, 600);
}

.severity-medium {
  color: var(--color-warning, #f59e0b);
  font-weight: var(--font-weight-medium, 500);
}

.severity-low {
  color: var(--color-info, #3b82f6);
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

/* 动画 */
.error-fade-enter-active,
.error-fade-leave-active {
  transition: all 0.3s ease;
}

.error-fade-enter-from,
.error-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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
.error-stack::-webkit-scrollbar,
.error-metadata::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.error-stack::-webkit-scrollbar-track,
.error-metadata::-webkit-scrollbar-track {
  background: transparent;
}

.error-stack::-webkit-scrollbar-thumb,
.error-metadata::-webkit-scrollbar-thumb {
  background: var(--border-medium, #d1d5db);
  border-radius: 2px;
}

.error-stack::-webkit-scrollbar-thumb:hover,
.error-metadata::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary, #6b7280);
}
</style>
