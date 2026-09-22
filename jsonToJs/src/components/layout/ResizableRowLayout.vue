<template>
  <ResizableContainer
    :item-count="rowCount"
    direction="vertical"
    header-component="RowHeader"
    :collapsed-size-percentage="8"
    :min-expanded-size-percentage="15"
  >
    <template
      v-for="(_, index) in rowCount"
      :key="index"
      #[`item${index+1}`]
    >
      <slot :name="`row${index + 1}`"></slot>
    </template>
  </ResizableContainer>
</template>

<script setup>
import ResizableContainer from './ResizableContainer.vue'

const props = defineProps({
  rowCount: {
    type: Number,
    required: true,
    validator: (value) => value >= 1,
  },
})
</script>
