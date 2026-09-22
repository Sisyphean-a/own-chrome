<template>
  <div class="json-result-display">
    <JsonView :json="jsonState.transformedJson" />
  </div>
</template>

<script setup>
import { useJsonContext } from '../composables/useJsonContext.js'
import JsonView from './JsonView.vue'

// 使用JSON上下文获取转换结果
const { jsonState } = useJsonContext()
</script>

<style lang="scss" scoped>
.json-result-display {
  height: 100%;
  width: 100%;
}
</style>
