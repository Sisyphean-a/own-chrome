<template>
  <main class="workspace">
    <header class="workspace-header">
      <div class="brand-mark" aria-hidden="true">{ }</div>
      <div class="brand-copy">
        <div class="eyebrow">JSON WORKSPACE</div>
        <h1>JSON 数据筛选</h1>
        <p>粘贴数据，选择字段，实时查看结果。</p>
      </div>
      <span class="header-hint">本地处理 · 无需上传</span>
    </header>

    <div class="workspace-grid">
      <section class="workspace-pane source-pane" aria-label="JSON 输入与预览">
        <JsonDisplayWithInput />
      </section>
      <section class="workspace-pane result-pane" aria-label="筛选配置与结果">
        <div class="settings-area">
          <FilterPanel />
        </div>
        <JsonResultDisplay />
      </section>
    </div>
  </main>
</template>

<script setup>
import { provideJsonContext } from '@/features/json-processor/composables/useJsonContext.js'
import { usePageStateStore } from '@/stores/pageState.js'
import JsonDisplayWithInput from '@/features/json-processor/components/JsonDisplayWithInput.vue'
import FilterPanel from '@/features/json-processor/components/FilterPanel.vue'
import JsonResultDisplay from '@/features/json-processor/components/JsonResultDisplay.vue'

usePageStateStore().initJsonPage()
provideJsonContext()
</script>

<style lang="scss" scoped>
.workspace {
  --bg-primary: #fff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f8fafc;
  --text-primary: #17253b;
  --text-secondary: #53647c;
  --text-tertiary: #687890;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  background: #f3f6fb;
  color: var(--text-primary);
}

.workspace-header {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 88px;
  padding: 16px clamp(20px, 3vw, 44px);
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.brand-mark {
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  height: 44px;
  border-radius: 12px;
  background: #2563eb;
  color: #fff;
  font: 700 18px var(--font-family-mono);
}

.brand-copy { min-width: 0; }
.eyebrow {
  font-size: 10px;
  letter-spacing: 0.14em;
  font-weight: 700;
  color: #2563eb;
}
h1 { font-size: 18px; font-weight: 700; line-height: 1.3; }
p { font-size: 12px; color: var(--text-secondary); }
.header-hint {
  margin-left: auto;
  padding: 7px 11px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
  white-space: nowrap;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
  padding: 16px clamp(16px, 2.5vw, 36px) 20px;
}
.workspace-pane {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #dce4ef;
  border-radius: 14px;
  box-shadow: 0 3px 16px rgba(30, 53, 88, 0.04);
}
.result-pane { display: flex; flex-direction: column; }
.settings-area {
  flex: 0 0 auto;
  max-height: 52%;
  overflow-y: auto;
  border-bottom: 1px solid #e2e8f0;
}

@media (max-width: 900px) {
  .workspace { overflow-y: auto; height: 100dvh; }
  .workspace-grid { display: flex; flex-direction: column; min-height: auto; }
  .workspace-pane { overflow: visible; flex: none; }
  .settings-area { max-height: none; overflow: visible; }
  .source-pane { height: 640px; overflow: hidden; }
  .result-pane { min-height: 460px; }
}
@media (max-width: 600px) {
  .workspace-header { min-height: 76px; padding: 12px 16px; }
  .header-hint, .eyebrow { display: none; }
  h1 { font-size: 16px; }
  .workspace-grid { gap: 12px; padding: 12px; }
  .source-pane { height: 560px; }
}
</style>
