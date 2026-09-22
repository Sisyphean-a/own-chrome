<template>
  <header
    class="modal-header"
    :class="headerClasses"
  >
    <div class="header-content">
      <!-- 图标区域 -->
      <div
        class="header-icon"
        v-if="icon || $slots.icon"
      >
        <slot name="icon">
          <v-icon
            v-if="icon"
            :size="iconSize"
            color="white"
            >{{ icon }}</v-icon
          >
        </slot>
      </div>

      <!-- 文本区域 -->
      <div class="header-text">
        <h2 class="header-title">
          {{ title }}
          <span
            v-if="subtitle"
            class="header-subtitle"
            >{{ subtitle }}</span
          >
        </h2>
        <!-- 额外内容插槽 -->
        <slot name="extra"></slot>
      </div>
    </div>

    <!-- 右侧操作区域 -->
    <div class="header-actions">
      <!-- 自定义操作插槽 -->
      <slot name="actions"></slot>

      <!-- 关闭按钮 -->
      <button
        v-if="showCloseButton"
        class="close-btn"
        @click="handleClose"
        :aria-label="closeButtonLabel"
      >
        <slot name="close-icon">
          <v-icon
            :size="closeIconSize"
            color="rgba(255,255,255,0.8)"
            >{{ closeIcon }}</v-icon
          >
        </slot>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 主标题
  title: {
    type: String,
    required: true,
  },
  // 副标题
  subtitle: {
    type: String,
    default: '',
  },
  // 图标名称
  icon: {
    type: String,
    default: '',
  },
  // 图标大小
  iconSize: {
    type: [String, Number],
    default: 20,
  },
  // 是否显示关闭按钮
  showCloseButton: {
    type: Boolean,
    default: true,
  },
  // 关闭图标
  closeIcon: {
    type: String,
    default: 'mdi-close',
  },
  // 关闭图标大小
  closeIconSize: {
    type: [String, Number],
    default: 18,
  },
  // 关闭按钮的 aria-label
  closeButtonLabel: {
    type: String,
    default: '关闭弹窗',
  },
  // 头部主题变体
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'primary', 'success', 'warning', 'danger'].includes(value),
  },
  // 是否使用简洁模式（无背景图案）
  minimal: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

// 计算头部样式类
const headerClasses = computed(() => {
  return [
    `modal-header--${props.variant}`,
    {
      'modal-header--minimal': props.minimal,
    },
  ]
})

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
/* ========================================
   基础头部样式
======================================== */

.modal-header {
  padding: var(--spacing-lg) var(--spacing-2xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  min-height: 60px;
}

/* 默认主题 - 深色技术风格 */
.modal-header--default {
  background: linear-gradient(135deg, var(--color-gray-800) 0%, var(--color-gray-700) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header--primary {
  background: linear-gradient(135deg, var(--color-primary-900) 0%, var(--color-primary-800) 100%);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.modal-header--success {
  background: linear-gradient(135deg, #065f46 0%, #047857 100%);
  border-bottom: 1px solid rgba(16, 185, 129, 0.2);
}

.modal-header--warning {
  background: linear-gradient(135deg, #92400e 0%, #b45309 100%);
  border-bottom: 1px solid rgba(245, 158, 11, 0.2);
}

.modal-header--danger {
  background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%);
  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
}

/* 背景图案 */
.modal-header:not(.modal-header--minimal)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
  pointer-events: none;
}

/* 头部内容区域 */
.header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.header-icon {
  width: 36px;
  height: 36px;
  background: var(--glass-bg);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: var(--backdrop-blur);
  border: 1px solid var(--glass-border);
  flex-shrink: 0;
  transition: all var(--transition-normal);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.header-icon:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
}

.header-text {
  color: var(--text-inverse);
  flex: 1;
  min-width: 0;
}

.header-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  margin: 0;
  line-height: 1.2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.header-subtitle {
  font-size: var(--font-size-base);
  opacity: 0.85;
  font-weight: var(--font-weight-normal);
  margin: 0;
  margin-left: 0;
}

/* 右侧操作区域 */
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  position: relative;
  z-index: 1;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--glass-bg);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  backdrop-filter: var(--backdrop-blur);
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
}

.close-btn:focus {
  outline: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 0 2px rgba(255, 255, 255, 0.3);
}

.close-btn:active {
  background: rgba(255, 255, 255, 0.15);
}

/* 简洁模式下的头部标题适配 */
.modal-header--minimal .header-title {
  color: var(--text-primary);
  text-shadow: none;
}

.modal-header--minimal .header-text {
  color: var(--text-primary);
}

.modal-header--minimal .header-icon {
  background: rgba(var(--color-gray-800), 0.06);
  border-color: rgba(var(--color-gray-800), 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.modal-header--minimal .close-btn {
  background: rgba(var(--color-gray-800), 0.06);
  border-color: rgba(var(--color-gray-800), 0.12);
  color: var(--text-secondary);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.modal-header--minimal .close-btn:hover {
  background: rgba(var(--color-gray-800), 0.1);
  border-color: rgba(var(--color-gray-800), 0.18);
}

/* 可访问性增强 */
@media (prefers-reduced-motion: reduce) {
  .header-icon,
  .close-btn {
    transition: none;
  }
}

/* 高对比度支持 */
@media (prefers-contrast: high) {
  .modal-header {
    border-bottom: 2px solid rgba(255, 255, 255, 0.5);
  }

  .header-icon,
  .close-btn {
    border-width: 2px;
  }
}
</style>
