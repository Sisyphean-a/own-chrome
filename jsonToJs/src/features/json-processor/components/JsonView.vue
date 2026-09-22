<template>
  <div class="json-container">
    <v-snackbar
      v-model="snackbar"
      :timeout="500"
      color="success"
      location="top"
    >
      {{ snackbarText }}
    </v-snackbar>
    <div class="json-content">
      <div
        :class="['json-view', length ? 'closeable' : '']"
        :style="'font-size:' + fontSize + 'px'"
        :data-path="componentId + '-' + jsonPath"
      >
        <span
          @click="toggleExpand"
          :class="['toggle-icon', !isExpanded ? 'closed' : '']"
          v-if="length"
        ></span>
        <div class="content-wrap">
          <p class="first-line">
            <span
              v-if="jsonKey"
              class="json-key clickable"
              @click.stop="handleKeyClick(jsonKey)"
              >"{{ jsonKey }}":</span
            >
            <span v-if="length">
              {{ prefix
              }}<span
                v-if="!isExpanded"
                class="collapsed-content"
                @click="toggleExpand"
                :title="jsonPath"
                >...</span
              ><span v-if="!isExpanded">{{ subfix }}</span>
              <span class="json-note">
                {{ !isExpanded ? ' ' + length : '' }}
              </span>
            </span>
            <span v-if="!length">{{ isArray ? '[]' : '{}' }}</span>

            <!-- 复制按钮直接放在内容后面 -->
            <button
              class="copy-btn"
              :class="{ 'root-level': isRootLevel }"
              @click.stop="copyJson"
              title="复制JSON"
            >
              <img
                src="@/assets/icons/copy.svg"
                alt="复制"
                width="14"
                height="14"
              />
            </button>
            <!-- 新增展开所有按钮，仅在当前节点已展开且有折叠子节点时显示 -->
            <button
              v-if="isExpanded && hasCollapsedDescendants"
              class="expand-all-btn"
              :class="{ 'root-level': isRootLevel }"
              @click.stop="expandAllDescendants"
              title="展开所有子级"
            >
              <img
                src="@/assets/icons/expand.svg"
                alt="展开所有"
                width="14"
                height="14"
              />
            </button>
          </p>
          <div
            v-if="isExpanded && length && forceRender"
            class="json-body"
          >
            <template
              v-for="(item, index) in renderedItems"
              :key="index"
            >
              <json-view
                :closed="closed"
                v-if="item.isJSON"
                :json="item.value"
                :jsonKey="item.key"
                :isLast="index === items.length - 1"
                :fontSize="fontSize"
                :isRootLevel="false"
                :depth="currentDepth + 1"
                :maxExpandDepth="maxExpandDepth"
                :jsonPath="generateChildPath(item.key, index)"
                :clickMode="clickMode"
                @field-click="(fieldName) => emit('field-click', fieldName)"
              ></json-view>
              <p
                class="json-item"
                v-else
              >
                <span
                  class="json-key clickable"
                  @click.stop="handleKeyClick(item.key)"
                >
                  {{ isArray ? '' : '"' + item.key + '"' }}
                </span>
                <span v-if="!isArray || item.key">:</span>
                <span
                  class="json-value clickable"
                  :class="{
                    'json-string': item.type === 'string',
                    'json-number': item.type === 'number',
                    'json-bool': item.type === 'boolean',
                  }"
                  @click.stop="copyKey(item.value)"
                >
                  {{ item.value + (index === items.length - 1 ? '' : ',') }}
                </span>
              </p>
            </template>
            <p
              v-if="renderingComplete === false"
              class="json-loading"
            >
              加载中...
            </p>
            <span
              v-show="isExpanded"
              class="body-line"
            ></span>
          </div>
          <p
            v-if="isExpanded && length"
            class="last-line"
          >
            <span>{{ subfix }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, provide, inject, onUnmounted } from 'vue'

const props = defineProps({
  json: {
    type: [Object, Array],
    required: false,
    default: null,
  },
  jsonKey: {
    type: String,
    default: '',
  },
  closed: {
    type: Boolean,
    default: false,
  },
  isLast: {
    type: Boolean,
    default: true,
  },
  fontSize: {
    type: Number,
    default: 18,
  },
  isRootLevel: {
    type: Boolean,
    default: true,
  },
  // 当前深度层级
  depth: {
    type: Number,
    default: 0,
  },
  // 默认最大展开深度
  maxExpandDepth: {
    type: Number,
    default: 3,
  },
  // JSON 路径标识
  jsonPath: {
    type: String,
    default: '',
  },
  componentId: {
    type: String,
    default: () => Math.random().toString(36).substr(2, 9),
  },
  // 点击模式：'copy' 复制模式 | 'filter' 筛选模式
  clickMode: {
    type: String,
    default: 'copy',
    validator: (value) => ['copy', 'filter'].includes(value),
  },
})

// 定义事件
const emit = defineEmits(['field-click'])

const snackbar = ref(false)
const snackbarText = ref('')

// 计算当前深度
const currentDepth = computed(() => props.depth)

// 展开/折叠状态 - 注意这里与之前的innerclosed逻辑相反
const isExpanded = ref(!(props.closed || props.depth >= props.maxExpandDepth))
// 是否需要渲染子节点 - 初始状态与展开状态相同
const forceRender = ref(isExpanded.value)

// 异步渲染相关状态
const renderedItems = ref([])
const renderingComplete = ref(false)
const batchSize = 20 // 每批渲染的项目数量

// 生成子节点的JSON路径
const generateChildPath = (key, index) => {
  const basePathStr = props.jsonPath || ''
  // 对于数组，使用索引作为路径
  if (isArray.value) {
    return `${basePathStr}/${index}`
  }
  // 对于对象，使用键名作为路径
  return `${basePathStr}/${key}`
}

const copyJson = () => {
  if (!props.json) return
  const jsonStr = JSON.stringify(props.json, null, 2)
  navigator.clipboard.writeText(jsonStr).then(() => {
    snackbar.value = true
    snackbarText.value = 'JSON复制成功'
  })
}

const isObjectOrArray = (source) => {
  const type = Object.prototype.toString.call(source)
  return type === '[object Array]' || type === '[object Object]'
}

// 切换展开/折叠状态
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value

  // 只有当展开时才设置forceRender为true
  if (isExpanded.value) {
    forceRender.value = true
    // 如果展开且尚未渲染任何项，则启动渲染
    if (items.value.length > 0 && renderedItems.value.length === 0) {
      startRender()
    }
  }
}

// 开始渲染流程
const startRender = () => {
  // 如果items数量少，直接一次性渲染
  if (items.value.length <= batchSize) {
    renderedItems.value = items.value
    renderingComplete.value = true
    return
  }

  // 重置渲染状态
  renderedItems.value = []
  renderingComplete.value = false

  // 开始批量渲染
  nextTick(() => {
    renderBatch(0, items.value)
  })
}

const isArray = computed(() => {
  if (!props.json) return false
  return Object.prototype.toString.call(props.json) === '[object Array]'
})

const length = computed(() => {
  if (!props.json) return 0
  return isArray.value ? props.json.length : Object.keys(props.json).length
})

const subfix = computed(() => {
  return (isArray.value ? ']' : '}') + (props.isLast ? '' : ',')
})

const prefix = computed(() => {
  return isArray.value ? '[' : '{'
})

const items = computed(() => {
  if (!props.json) return []

  if (isArray.value) {
    return props.json.map((item) => {
      const isJSON = isObjectOrArray(item)
      let type = typeof item
      if (isJSON) type = 'json'
      return {
        value: isJSON ? item : JSON.stringify(item),
        isJSON,
        key: '',
        type,
        raw: item,
      }
    })
  }

  const json = props.json
  return Object.keys(json).map((key) => {
    const item = json[key]
    const isJSON = isObjectOrArray(item)
    let type = typeof item
    if (isJSON) type = 'json'
    return {
      value: isJSON ? item : JSON.stringify(item),
      isJSON,
      key,
      type,
      raw: item,
    }
  })
})

// 异步渲染函数
const renderBatch = (startIdx, allItems) => {
  const endIdx = Math.min(startIdx + batchSize, allItems.length)

  // 使用requestIdleCallback实现时间分片（兼容性处理）
  const requestIdle =
    window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 50 }), 1))

  requestIdle(() => {
    // 如果已经折叠或不再需要渲染，则停止渲染过程
    if (!isExpanded.value || !forceRender.value) {
      renderingComplete.value = true
      return
    }

    renderedItems.value = [...renderedItems.value, ...allItems.slice(startIdx, endIdx)]

    if (endIdx < allItems.length) {
      renderBatch(endIdx, allItems)
    } else {
      renderingComplete.value = true
    }
  })
}

// 检查是否有已折叠的后代节点
const hasCollapsedDescendants = computed(() => {
  // 如果当前节点没有子项，或者当前节点是折叠的，则没有需要展开的后代
  if (!props.json || !length.value || !isExpanded.value) return false

  return items.value.some((item) => {
    // 对于JSON类型的子项
    if (item.isJSON && item.value) {
      const valueType = Object.prototype.toString.call(item.value)
      const hasChildren =
        valueType === '[object Array]'
          ? item.value.length > 0
          : item.value && Object.keys(item.value).length > 0

      // 如果有子项，就可能需要展开
      return hasChildren
    }
    return false
  })
})

// 展开所有后代节点 - 简化实现
const expandAllDescendants = () => {
  nextTick(() => {
    const currentElement = document.querySelector(
      `[data-path="${props.componentId}-${props.jsonPath}"]`
    )
    if (!currentElement) return

    const childNodes = currentElement.querySelectorAll('.json-view')
    childNodes.forEach((node) => {
      const toggleIcon = node.querySelector('.toggle-icon')
      if (toggleIcon && toggleIcon.classList.contains('closed')) {
        toggleIcon.click()
      }
    })
  })
}

// 注册事件监听
onMounted(() => {
  if (isExpanded.value && forceRender.value) {
    startRender()
  }
})

// 移除事件监听
onUnmounted(() => {
  // 移除之前的事件监听
})

// 监听items变化
watch(
  () => items.value,
  (newItems) => {
    // 只有在展开状态且需要渲染时才处理
    if (isExpanded.value && forceRender.value) {
      // 如果items为空，直接设置完成
      if (newItems.length === 0) {
        renderedItems.value = newItems
        renderingComplete.value = true
        return
      }

      startRender()
    }
  }
)

const handleKeyClick = (key) => {
  const cleanKey =
    typeof key === 'string' && key.startsWith('"') && key.endsWith('"') ? key.slice(1, -1) : key

  if (props.clickMode === 'filter') {
    // 筛选模式：发出字段点击事件
    emit('field-click', cleanKey)
    snackbar.value = true
    snackbarText.value = `已添加字段: ${cleanKey}`
  } else {
    // 复制模式：复制到剪切板
    navigator.clipboard.writeText(cleanKey).then(() => {
      snackbar.value = true
      snackbarText.value = `复制成功: ${cleanKey}`
    })
  }
}

// 保持向后兼容的copyKey函数
const copyKey = (key) => {
  const textToCopy =
    typeof key === 'string' && key.startsWith('"') && key.endsWith('"') ? key.slice(1, -1) : key

  navigator.clipboard.writeText(textToCopy).then(() => {
    snackbar.value = true
    snackbarText.value = textToCopy
  })
}
</script>

<style lang="scss" scoped>
.json-container {
  background-color: var(--bg-tertiary);
  padding: var(--spacing-sm);
  padding-right: var(--spacing-4xl);
  border-radius: var(--radius-sm);
  position: relative;
}

.json-content {
  position: relative;
}

.json-view {
  position: relative;
  display: block;
  width: 100%;
  white-space: nowrap;
  padding-left: var(--spacing-xl);
  box-sizing: border-box;
  font-family: var(--font-family-mono);
  line-height: 1.5;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 16px;
  height: 16px;
  margin-left: var(--spacing-sm);
  opacity: 0;
  transition: opacity var(--transition-fast);

  /* 根层级永远显示 */
  &.root-level {
    opacity: 0.7;
  }

  &:hover {
    opacity: 1;
  }
}

/* 非根层级，鼠标悬停时显示 */
.first-line:hover .copy-btn:not(.root-level) {
  opacity: 0.7;
}

.json-note {
  color: var(--text-tertiary);
  font-style: italic;
  margin-left: var(--spacing-xs);
}

.json-key {
  color: #e83e8c;
  font-weight: var(--font-weight-medium);
}

.json-value {
  color: var(--color-success);
  font-weight: var(--font-weight-normal);
}

.json-string {
  color: var(--color-success);
}

.json-number {
  color: var(--color-info);
}

.json-bool {
  color: var(--color-warning);
}

.json-loading {
  padding-left: var(--spacing-xl);
  color: var(--text-tertiary);
  font-style: italic;
}

.collapsed-content {
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.03);
  padding: 0 var(--spacing-xs);
  border-radius: var(--radius-xs);
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: rgba(0, 0, 0, 0.08);
  }
}

.json-item {
  margin: 0;
  padding-left: var(--spacing-2xl);
  line-height: 1.4;
  min-height: 20px;

  .json-key + span {
    margin: 0 var(--spacing-xs) 0 0;
  }
}

.first-line {
  padding: 0;
  margin: 0;
  line-height: 1.4;
  min-height: 22px;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}

.json-body {
  position: relative;
  padding: 0;
  margin: 0 0 0 1px;

  .body-line {
    position: absolute;
    height: 100%;
    width: 0;
    border-left: 1px solid var(--border-light);
    top: 0;
    left: 2px;
  }
}

.last-line {
  padding: 0;
  margin: 0;
  min-height: 20px;
}

.toggle-icon {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  width: 16px;
  height: 16px;
  text-align: center;
  left: 0;
  top: 7px;
  border-radius: var(--radius-xs);
  transition: all var(--transition-fast);

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &::before {
    content: '';
    display: block;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 5px 3px 0 3px;
    border-color: var(--text-secondary) transparent transparent transparent;
    transition: transform var(--transition-fast);
  }

  &.closed::before {
    transform: rotate(-90deg);
  }
}

.expand-all-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 16px;
  height: 16px;
  margin-left: var(--spacing-sm);
  opacity: 0;
  transition: opacity var(--transition-fast);

  /* 根层级永远显示 */
  &.root-level {
    opacity: 0.7;
  }

  &:hover {
    opacity: 1;
  }
}

/* 非根层级，鼠标悬停时显示 */
.first-line:hover .expand-all-btn:not(.root-level) {
  opacity: 0.7;
}

.json-item .clickable {
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    opacity: 0.7;
  }
}
</style>
