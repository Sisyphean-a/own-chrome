<template>
  <div
    class="row-header"
    @click="$emit('toggle')"
  >
    <div class="header-content">
      <span class="collapse-icon">
        {{ isCollapsed ? '⟱' : '⟰' }}
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
.row-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(248, 250, 252, 0.9);
  cursor: pointer;
  height: 30px;
  box-sizing: border-box;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  &:hover {
    background: rgba(30, 41, 59, 0.08);
    border-bottom-color: rgba(30, 41, 59, 0.3);
  }

  &:active {
    background: rgba(30, 41, 59, 0.12);
  }
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.collapse-icon {
  font-size: 14px;
  color: #64748b;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
}

.row-header:hover {
  .collapse-icon {
    color: #334155;
    transform: scale(1.1);
  }
}

/* 可访问性增强 */
@media (prefers-reduced-motion: reduce) {
  .row-header,
  .collapse-icon {
    transition: none;
  }
}

/* 高对比度支持 */
@media (prefers-contrast: high) {
  .row-header {
    border-bottom-color: #000;
  }

  .collapse-icon {
    color: #000;
  }

  .row-header:hover .collapse-icon {
    color: #000;
  }
}
</style>
