<template>
  <section class="result-display" aria-label="筛选结果">
    <div class="result-heading">
      <div>
        <span class="step">03 / OUTPUT</span>
        <h2>筛选结果</h2>
      </div>
      <span v-if="jsonState.isExecuting" class="status">处理中…</span>
      <span v-else-if="jsonState.parsedJson !== null && jsonState.filterConfig.selectedKeys.length && jsonState.transformedJson !== null && !jsonState.transformErrors.length" class="status ready">已生成</span>
    </div>
    <div class="result-body" aria-live="polite">
      <div v-if="jsonState.parsedJson === null && jsonState.parseErrors.length" class="result-empty error" role="status">
        <strong>输入 JSON 有误</strong>
        <span>修正左侧输入后再查看结果。</span>
      </div>
      <div v-else-if="jsonState.filterConfig.selectedKeys.length && jsonState.transformErrors.length" class="result-empty error" role="alert">
        <strong>筛选未完成</strong>
        <span>{{ jsonState.transformErrors[jsonState.transformErrors.length - 1].message }}</span>
      </div>
      <JsonView v-else-if="jsonState.filterConfig.selectedKeys.length && jsonState.transformedJson !== null" :json="jsonState.transformedJson" :font-size="14" />
      <div v-else class="result-empty">
        <span class="empty-icon" aria-hidden="true">{ }</span>
        <strong>结果会显示在这里</strong>
        <span>选择至少一个字段后，自动生成筛选结果。</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useJsonContext } from '../composables/useJsonContext.js'
import JsonView from './JsonView.vue'
const { jsonState } = useJsonContext()
</script>

<style lang="scss" scoped>
.result-display { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.result-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 22px 14px; }
.step { font-size: 10px; font-weight: 700; letter-spacing: .14em; color: #2563eb; }
h2 { margin-top: 3px; font-size: 17px; font-weight: 700; }
.status { color: #53647c; font-size: 11px; white-space: nowrap; }
.status.ready { color: #08785c; }
.result-body { flex: 1; min-height: 0; overflow: auto; padding: 0 22px 22px; }
.result-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 220px; height: 100%; padding: 24px; border: 1px dashed #cbd5e1; border-radius: 9px; background: #f8fafc; text-align: center; color: #53647c; font-size: 12px; }
.result-empty strong { color: #17253b; font-size: 14px; font-weight: 600; }
.empty-icon { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 5px; border-radius: 10px; background: #eaf1fc; color: #2563eb; font: 700 18px var(--font-family-mono); }
.result-empty.error { border-color: #f1b5b5; background: #fff8f8; overflow-wrap: anywhere; }
@media (max-width: 900px) { .result-body { min-height: 280px; } }
@media (max-width: 600px) { .result-heading { padding: 16px; } .result-body { padding: 0 16px 16px; } }
</style>
