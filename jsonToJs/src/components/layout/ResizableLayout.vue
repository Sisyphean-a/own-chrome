<template>
  <ResizableContainer
    :item-count="columnCount"
    :direction="direction"
    :header-component="headerComponent"
    :initial-sizes="initialSizes"
    :collapsed-size-percentage="4"
    :min-expanded-size-percentage="10"
  >
    <template
      v-for="(_, index) in columnCount"
      :key="index"
      #[`item${index+1}`]
    >
      <slot :name="`column${index + 1}`"></slot>
    </template>
  </ResizableContainer>
</template>

<script setup>
import { computed } from 'vue'
import ResizableContainer from './ResizableContainer.vue'

const props = defineProps({
  columnCount: {
    type: Number,
    required: true,
    validator: (value) => value >= 1,
  },
  direction: {
    type: String,
    default: 'horizontal',
    validator: (value) => ['horizontal', 'vertical'].includes(value),
  },
  initialSizes: {
    type: Array,
    default: () => [],
  },
})

const headerComponent = computed(() =>
  props.direction === 'horizontal' ? 'ColumnHeader' : 'RowHeader'
)
</script>
