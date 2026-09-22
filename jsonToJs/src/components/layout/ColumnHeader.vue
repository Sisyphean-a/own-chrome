<template>
  <div
    class="column-header"
    @click="$emit('toggle')"
  >
    <div class="header-content">
      <span class="collapse-icon">
        {{ isCollapsed ? '⟶' : '⟷' }}
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isCollapsed: {
    type: Boolean,
    required: true,
  },
})

defineEmits(['toggle'])
</script>

<style lang="scss" scoped>
.column-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
  background: rgba(var(--color-gray-50), 0.9);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  cursor: pointer;
  height: 35px;
  box-sizing: border-box;
  transition: all var(--transition-normal);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);

  &:hover {
    background: rgba(var(--color-gray-800), 0.08);
    border-bottom-color: var(--border-medium);
  }

  &:active {
    background: rgba(var(--color-gray-800), 0.12);
  }
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  user-select: none;
}

.collapse-icon {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  transition: all var(--transition-normal);
  font-weight: var(--font-weight-medium);
}

.column-header:hover {
  .collapse-icon {
    color: var(--text-primary);
    transform: scale(1.1);
  }

  .collapse-text {
    color: var(--text-primary);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .column-header {
    height: 40px;
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .header-content {
    gap: var(--spacing-xs);
  }

  .collapse-icon {
    font-size: var(--font-size-base);
  }

  .collapse-text {
    font-size: var(--font-size-sm);
  }
}

/* 可访问性增强 */
@media (prefers-reduced-motion: reduce) {
  .column-header,
  .collapse-icon,
  .collapse-text {
    transition: none;
  }
}

/* 高对比度支持 */
@media (prefers-contrast: high) {
  .column-header {
    border-bottom-color: var(--text-primary);
  }

  .collapse-text {
    color: var(--text-primary);
  }

  .column-header:hover .collapse-text {
    color: var(--text-primary);
  }
}
</style>
