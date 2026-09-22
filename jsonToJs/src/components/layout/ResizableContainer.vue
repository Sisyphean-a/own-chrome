<template>
  <div
    :class="containerClass"
    :style="containerStyle"
  >
    <template
      v-for="(_, index) in itemCount"
      :key="index"
    >
      <v-sheet
        :class="itemClass"
        :style="getItemStyle(index)"
      >
        <component
          :is="components[headerComponent]"
          :is-collapsed="isCollapsed[index]"
          @toggle="toggleItem(index)"
        />
        <div
          :class="contentClass"
          v-show="!isCollapsed[index] && transitioningItem !== index"
        >
          <slot :name="`item${index + 1}`"></slot>
        </div>
      </v-sheet>
      <div
        v-if="index < itemCount - 1"
        :class="handleClass"
        @mousedown="(event) => startResize(index, event)"
      ></div>
    </template>
  </div>
</template>

<script setup>
import { ref, onUnmounted, computed } from 'vue'
import ColumnHeader from './ColumnHeader.vue'
import RowHeader from './RowHeader.vue'
import { UI_CONFIG } from '@/shared/constants/ui-config.js'

// 注册组件
const components = {
  ColumnHeader,
  RowHeader,
}

const props = defineProps({
  itemCount: {
    type: Number,
    required: true,
    validator: (value) => value >= 1,
  },
  direction: {
    type: String,
    default: 'horizontal', // 'horizontal' 或 'vertical'
    validator: (value) => ['horizontal', 'vertical'].includes(value),
  },
  headerComponent: {
    type: String,
    required: true, // 'ColumnHeader' 或 'RowHeader'
  },
  collapsedSizePercentage: {
    type: Number,
    default: () => UI_CONFIG.dimensions.collapsedWidth.percentage, // 折叠后的大小百分比
  },
  minExpandedSizePercentage: {
    type: Number,
    default: () => UI_CONFIG.dimensions.collapsedWidth.minExpanded, // 展开时的最小大小百分比
  },
  initialSizes: {
    type: Array,
    default: () => [],
    validator: (value) => value.every((n) => typeof n === 'number' && n >= 0 && n <= 100),
  },
})

// 过渡状态控制
const transitioningItem = ref(null)
const transitionTimeout = ref(null)

// 尺寸百分比（宽度或高度）
const itemSizes = ref(
  props.initialSizes.length === props.itemCount
    ? [...props.initialSizes]
    : Array(props.itemCount).fill(100 / props.itemCount)
)
const resizingIndex = ref(null)
const startPosition = ref(0)
const startSizes = ref([])

// 折叠状态管理
const isCollapsed = ref(Array(props.itemCount).fill(false))

// 计算可见项的数量
const visibleItemsCount = computed(() => {
  return isCollapsed.value.filter((collapsed) => !collapsed).length
})

// 计算样式类
const containerClass = computed(() => {
  return props.direction === 'horizontal' ? 'd-flex flex-row' : 'd-flex flex-column'
})

const containerStyle = computed(() => {
  return props.direction === 'horizontal'
    ? 'height: 100vh; width: 100vw; overflow: hidden;'
    : 'height: 100%; width: 100%; overflow: hidden;'
})

const itemClass = computed(() => {
  return props.direction === 'horizontal' ? 'column' : 'row'
})

const contentClass = computed(() => {
  return props.direction === 'horizontal' ? 'column-content' : 'row-content'
})

const handleClass = computed(() => {
  return props.direction === 'horizontal' ? 'resize-handle' : 'resize-handle-horizontal'
})

// 获取项目样式
const getItemStyle = (index) => {
  const sizeProperty = props.direction === 'horizontal' ? 'width' : 'height'
  return { [sizeProperty]: `${itemSizes.value[index]}%` }
}

// 切换项的折叠状态
const toggleItem = (index) => {
  // 特殊处理：当只有两项时，折叠一项会自动展开另一项
  if (props.itemCount === 2) {
    const otherIndex = index === 0 ? 1 : 0

    // 如果要折叠当前项
    if (!isCollapsed.value[index]) {
      // 先展开另一项（如果它是折叠的）
      if (isCollapsed.value[otherIndex]) {
        isCollapsed.value[otherIndex] = false
      }
      // 然后折叠当前项
      isCollapsed.value[index] = true
    } else {
      // 如果要展开当前项，直接展开
      isCollapsed.value[index] = false
    }
  } else {
    // 多项情况：智能处理折叠逻辑
    if (!isCollapsed.value[index]) {
      // 要折叠当前项
      // 只有当这是最后一个展开的项时，才需要展开相邻项
      if (visibleItemsCount.value <= 1) {
        // 这是最后一个可见项，需要展开相邻项
        // 优先选择右侧/下方项，如果没有则选择左侧/上方项
        let targetIndex = -1

        // 先尝试右侧/下方项
        if (index < props.itemCount - 1) {
          targetIndex = index + 1
        } else if (index > 0) {
          // 没有右侧/下方项，选择左侧/上方项
          targetIndex = index - 1
        }

        // 如果目标项是折叠的，则展开它
        if (targetIndex !== -1 && isCollapsed.value[targetIndex]) {
          isCollapsed.value[targetIndex] = false
        }
      }

      isCollapsed.value[index] = true
    } else {
      // 要展开当前项，直接展开
      isCollapsed.value[index] = false
    }
  }

  transitioningItem.value = index

  // 清除之前的定时器
  if (transitionTimeout.value) {
    clearTimeout(transitionTimeout.value)
  }

  // 设置新的定时器
  transitionTimeout.value = setTimeout(() => {
    transitioningItem.value = null
    transitionTimeout.value = null
  }, UI_CONFIG.animations.duration.collapse) // 与CSS过渡时间保持一致

  redistributeSizes()
}

// 重新分配尺寸
const redistributeSizes = () => {
  const visibleCount = visibleItemsCount.value
  const collapsedCount = props.itemCount - visibleCount

  // 如果所有项都折叠，强制展开第一个
  if (visibleCount === 0 && collapsedCount > 0) {
    const firstCollapsedIndex = isCollapsed.value.findIndex((c) => c)
    if (firstCollapsedIndex !== -1) {
      isCollapsed.value[firstCollapsedIndex] = false
      return
    }
  }

  // 如果只有展开的项，则平分
  if (collapsedCount === 0) {
    itemSizes.value = Array(props.itemCount).fill(100 / props.itemCount)
    return
  }

  // 计算折叠项占用的总尺寸
  const totalCollapsedSize = collapsedCount * props.collapsedSizePercentage
  // 计算剩余给展开项的总尺寸
  const totalVisibleSize = 100 - totalCollapsedSize

  // 计算每个展开项的理论尺寸
  let visibleItemSize = totalVisibleSize / visibleCount

  // 确保展开项不低于最小尺寸
  if (visibleItemSize < props.minExpandedSizePercentage) {
    visibleItemSize = props.minExpandedSizePercentage
    const totalVisibleSize = visibleCount * visibleItemSize
    const remainingForCollapsed = 100 - totalVisibleSize
    const actualCollapsedSize = collapsedCount > 0 ? remainingForCollapsed / collapsedCount : 0

    itemSizes.value = Array(props.itemCount)
      .fill(0)
      .map((_, i) => (isCollapsed.value[i] ? Math.max(0, actualCollapsedSize) : visibleItemSize))
  } else {
    itemSizes.value = Array(props.itemCount)
      .fill(0)
      .map((_, i) => (isCollapsed.value[i] ? props.collapsedSizePercentage : visibleItemSize))
  }
}

// 开始调整大小
const startResize = (index, event) => {
  resizingIndex.value = index
  startPosition.value = props.direction === 'horizontal' ? event.clientX : event.clientY
  startSizes.value = [...itemSizes.value]

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
}

// 处理鼠标移动
const handleMouseMove = (event) => {
  if (resizingIndex.value === null) return

  const index = resizingIndex.value
  const firstIsCollapsed = isCollapsed.value[index]
  const secondIsCollapsed = isCollapsed.value[index + 1]

  if (firstIsCollapsed || secondIsCollapsed) {
    console.warn('Resizing adjacent to or of a collapsed item is currently disabled.')
    return
  }

  const currentPosition = props.direction === 'horizontal' ? event.clientX : event.clientY
  const delta = currentPosition - startPosition.value
  const containerSize =
    props.direction === 'horizontal'
      ? document.querySelector('.d-flex').offsetWidth
      : document.querySelector('.d-flex').offsetHeight
  let deltaPercentage = (delta / containerSize) * 100

  const originalSizeFirst = startSizes.value[index]
  const originalSizeSecond = startSizes.value[index + 1]

  // 计算初步的新尺寸
  let newSizeFirst = originalSizeFirst + deltaPercentage
  let newSizeSecond = originalSizeSecond - deltaPercentage

  // 应用最小尺寸限制
  const minSize = props.minExpandedSizePercentage
  if (newSizeFirst < minSize) {
    deltaPercentage = minSize - originalSizeFirst
    newSizeFirst = minSize
    newSizeSecond = originalSizeSecond - deltaPercentage
  } else if (newSizeSecond < minSize) {
    deltaPercentage = originalSizeSecond - minSize
    newSizeSecond = minSize
    newSizeFirst = originalSizeFirst + deltaPercentage
  }

  itemSizes.value[index] = newSizeFirst
  itemSizes.value[index + 1] = newSizeSecond
}

// 停止调整大小
const stopResize = () => {
  resizingIndex.value = null
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
}

// 组件卸载时移除事件监听和定时器
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
  if (transitionTimeout.value) {
    clearTimeout(transitionTimeout.value)
  }
})
</script>

<style lang="scss" scoped>
.d-flex {
  height: 100%;
  width: 100%;
}

.column {
  height: 100%;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-light);
  will-change: width;

  &:last-child {
    border-right: none;
  }
}

.row {
  width: 100%;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: height var(--transition-normal, 0.2s) ease;
  background-color: var(--bg-secondary, #fafafa);
  border-bottom: 1px solid var(--border-light, #e0e0e0);

  &:last-child {
    border-bottom: none;
  }
}

.column-content {
  flex: 1;
  overflow: auto;
  padding: var(--spacing-lg);
  background-color: var(--bg-primary);
  transition: display var(--transition-normal);
  will-change: display;
}

.row-content {
  flex: 1;
  overflow: auto;
  background-color: var(--bg-secondary, #fafafa);
}

.resize-handle {
  width: 6px;
  background-color: var(--border-medium);
  cursor: col-resize;
  height: 100%;
  transition: background-color var(--transition-fast);
  position: relative;
  z-index: var(--z-dropdown);

  &:hover,
  &:active {
    background-color: var(--color-primary-600);
  }
}

.resize-handle-horizontal {
  height: var(--resize-handle-size, 6px);
  background-color: var(--border-medium, #e0e0e0);
  cursor: row-resize;
  width: 100%;
  transition: background-color var(--transition-fast, 0.2s);
  position: relative;
  z-index: var(--z-resize-handle, 1);

  &:hover,
  &:active {
    background-color: var(--color-primary-600, #1976d2);
  }
}

:deep(.v-theme--light) {
  width: 100%;
  height: 100%;
}

:deep(.v-sheet) {
  width: 100%;
  height: 100%;
  background-color: transparent;
}
</style>
