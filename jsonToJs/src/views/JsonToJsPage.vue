<template>
  <div class="json-to-js-page">
    <resizable-layout :column-count="2">
      <template #column1>
        <json-display-with-input />
      </template>
      <template #column2>
        <JsonResultDisplay />
      </template>
    </resizable-layout>
  </div>
</template>

<script setup>
import { provideJsonContext } from '@/features/json-processor/composables/useJsonContext.js'
import { usePageStateStore } from '@/stores/pageState.js'
import ResizableLayout from '@/components/layout/ResizableLayout.vue'
import JsonDisplayWithInput from '@/features/json-processor/components/JsonDisplayWithInput.vue'
import JsonResultDisplay from '@/features/json-processor/components/JsonResultDisplay.vue'

// 使用页面状态store
const pageStateStore = usePageStateStore()

// 提供上下文，子组件可以直接使用
const jsonContext = provideJsonContext()

// 立即初始化页面状态，而不是等到mounted
pageStateStore.initJsonPage()
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
  font-style: italic;
}
</style>
