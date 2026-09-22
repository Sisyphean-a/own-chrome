<template>
  <!-- 背景遮罩层 -->
  <div
    v-if="modelValue"
    class="base-modal-overlay"
    @click="handleOverlayClick"
  >
    <!-- 主弹窗容器 -->
    <div
      class="base-modal-container"
      :class="[
        `base-modal--${size}`,
        {
          'base-modal--fullscreen': fullscreen,
          'base-modal--no-padding': noPadding,
        },
      ]"
      @click.stop
    >
      <!-- 头部插槽 -->
      <slot name="header"></slot>

      <!-- 内容插槽 -->
      <main
        class="base-modal-content"
        v-if="!hideContent"
      >
        <slot name="content"></slot>
      </main>

      <!-- 底部插槽 -->
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  // 弹窗大小：small、medium、large、extra-large
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large', 'extra-large'].includes(value),
  },
  // 是否全屏
  fullscreen: {
    type: Boolean,
    default: false,
  },
  // 是否禁用点击遮罩关闭
  persistentModal: {
    type: Boolean,
    default: false,
  },
  // 是否不显示内容区域（有些弹窗可能只有头部和底部）
  hideContent: {
    type: Boolean,
    default: false,
  },
  // 是否移除内容区域的默认padding
  noPadding: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'close'])

const handleOverlayClick = () => {
  if (!props.persistentModal) {
    emit('update:modelValue', false)
    emit('close')
  }
}
</script>

<style scoped>
/* ========================================
   基础弹窗样式
======================================== */

.base-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--spacing-xl);
  animation: overlayFadeIn var(--transition-normal);
}

.base-modal-container {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn var(--transition-slow);
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-light);
}

/* 不同尺寸的弹窗 */
.base-modal--small {
  max-width: 400px;
}

.base-modal--medium {
  max-width: 600px;
}

.base-modal--large {
  max-width: 800px;
}

.base-modal--extra-large {
  max-width: 1000px;
}

.base-modal--fullscreen {
  max-width: 95vw;
  max-height: 95vh;
  border-radius: var(--radius-xl);
}

/* 内容区域 */
.base-modal-content {
  padding: var(--spacing-2xl);
  overflow-y: auto;
  flex: 1;
  scroll-behavior: smooth;
}

.base-modal--no-padding .base-modal-content {
  padding: 0;
}

/* 滚动条样式 */
.base-modal-content::-webkit-scrollbar {
  width: 6px;
}

.base-modal-content::-webkit-scrollbar-track {
  background: transparent;
}

.base-modal-content::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: var(--radius-xs);
}

.base-modal-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 动画定义 */
@keyframes overlayFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 可访问性增强 */
@media (prefers-reduced-motion: reduce) {
  .base-modal-overlay,
  .base-modal-container {
    animation: none;
    transition: none;
  }
}
</style>
