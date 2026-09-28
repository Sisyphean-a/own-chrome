<template>
  <div class="source-layout">
    <div class="section-heading">
      <div>
        <span class="step">01 / SOURCE</span>
        <h2>输入 JSON</h2>
      </div>
      <v-btn
        variant="outlined"
        size="small"
        color="primary"
        :loading="isReadingClipboard"
        @click="readFromClipboard"
      >粘贴剪贴板</v-btn>
    </div>

    <div class="editor-area">
      <label for="json-source" class="sr-only">JSON 数据</label>
      <textarea
        id="json-source"
        v-model="localJsonInput"
        spellcheck="false"
        placeholder="在这里粘贴 JSON 数据…"
        :aria-invalid="hasError"
        :aria-describedby="hasError ? 'json-error' : undefined"
        @input="handleInput"
      ></textarea>
      <div class="editor-footer">
        <span v-if="hasError" id="json-error" class="error-message" role="alert">{{ jsonState.parseErrors[0].message }}</span>
        <span v-else-if="clipboardError" class="error-message" role="alert">{{ clipboardError }}</span>
        <span v-else>{{ jsonState.parsedJson !== null ? 'JSON 格式有效' : '等待输入 JSON' }}</span>
        <span>{{ localJsonInput.length.toLocaleString() }} 字符</span>
      </div>
    </div>

    <div class="preview-heading">
      <div>
        <h3>结构预览</h3>
        <p>点击字段名，将它添加到筛选列表</p>
      </div>
      <span class="preview-label">可交互</span>
    </div>
    <div class="json-display-area">
      <JsonView v-if="jsonState.parsedJson !== null" :json="jsonState.parsedJson" :font-size="14" click-mode="filter" @field-click="handleFieldClick" />
      <div v-else class="preview-empty">输入有效的 JSON 后，在这里浏览数据结构。</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useJsonContext } from '../composables/useJsonContext.js'
import JsonView from './JsonView.vue'

const { jsonState, updateJsonInput, addSelectedKey } = useJsonContext()
const localJsonInput = ref('')
const isReadingClipboard = ref(false)
const clipboardError = ref('')

watch(
  () => jsonState.inputJson,
  (newVal) => {
    if (newVal !== localJsonInput.value) localJsonInput.value = newVal
  },
  { immediate: true }
)

const hasError = computed(() => jsonState.parseErrors.length > 0)
const handleInput = () => {
  clipboardError.value = ''
  updateJsonInput(localJsonInput.value)
}
const handleFieldClick = (fieldName) => addSelectedKey(fieldName)

const readFromClipboard = async () => {
  if (!navigator.clipboard?.readText) {
    clipboardError.value = '当前环境无法读取剪贴板，请手动粘贴。'
    return
  }
  try {
    isReadingClipboard.value = true
    clipboardError.value = ''
    const text = await navigator.clipboard.readText()
    if (text.trim()) {
      localJsonInput.value = text.trim()
      handleInput()
    }
  } catch (error) {
    clipboardError.value = '读取剪贴板失败，请手动粘贴。'
  } finally {
    isReadingClipboard.value = false
  }
}
</script>

<style lang="scss" scoped>
.source-layout { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.section-heading, .preview-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 22px 14px;
}
.step { font-size: 10px; font-weight: 700; letter-spacing: .14em; color: #2563eb; }
h2 { margin-top: 3px; font-size: 17px; font-weight: 700; }
h3 { font-size: 14px; font-weight: 700; }
p { margin-top: 2px; font-size: 12px; color: var(--text-secondary); }
.editor-area { padding: 0 22px 18px; }
textarea {
  display: block;
  width: 100%;
  height: clamp(150px, 25vh, 260px);
  padding: 14px 16px;
  resize: vertical;
  border: 1px solid #d4deea;
  border-radius: 9px 9px 0 0;
  outline: none;
  background: #f8fafc;
  color: #17253b;
  font: 13px/1.6 var(--font-family-mono);
  tab-size: 2;
}
textarea:focus { border-color: #2563eb; box-shadow: inset 0 0 0 1px #2563eb; }
textarea[aria-invalid="true"] { border-color: #c24141; }
.editor-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border: 1px solid #d4deea;
  border-top: 0;
  border-radius: 0 0 9px 9px;
  font-size: 11px;
  color: var(--text-secondary);
}
.error-message { color: #b42332; overflow-wrap: anywhere; }
.editor-footer span:last-child { white-space: nowrap; margin-left: auto; }
.preview-heading { border-top: 1px solid #e2e8f0; padding-top: 14px; padding-bottom: 12px; }
.preview-label { color: #53647c; font-size: 11px; white-space: nowrap; }
.json-display-area { flex: 1; min-height: 0; overflow: auto; padding: 0 18px 18px; }
.preview-empty { padding: 28px 16px; border: 1px dashed #d4deea; border-radius: 8px; color: var(--text-secondary); font-size: 12px; text-align: center; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 600px) {
  .section-heading, .preview-heading { padding-left: 16px; padding-right: 16px; }
  .editor-area { padding: 0 16px 16px; }
  .json-display-area { padding: 0 12px 16px; }
  textarea { height: 160px; }
}
</style>
