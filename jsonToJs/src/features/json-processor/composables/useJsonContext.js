import { inject, provide, computed, watch } from 'vue'
import { useJsonProcessorStore } from '@/stores/jsonProcessor.js'
import { useErrorHandler } from '@/shared/composables/useErrorHandler.js'
import { generateFilterCode, executeFilterCode, debounce } from '@/shared/utils/filterUtils.js'

// JSON处理上下文
export const JSON_CONTEXT_KEY = Symbol('json-context')

export function useJsonContext() {
  const context = inject(JSON_CONTEXT_KEY)
  if (!context) {
    throw new Error('useJsonContext must be used within JsonProvider')
  }
  return context
}

export function provideJsonContext() {
  const jsonProcessor = useJsonProcessorStore()
  const { handleError } = useErrorHandler({
    context: 'JsonContext',
    maxErrors: 5,
    autoHideDelay: 5000,
  })

  // 统一的数据处理方法
  const updateJsonInput = (input) => {
    try {
      jsonProcessor.setInputJson(input)
    } catch (error) {
      handleError(error, 'JSON输入更新')
    }
  }

  const clearAllErrors = () => {
    jsonProcessor.clearErrors()
  }

  const getInputHistory = () => {
    return jsonProcessor.state.inputHistory
  }

  const restoreFromHistory = (historyItem) => {
    updateJsonInput(historyItem.content)
  }

  // 筛选相关方法
  const updateFilterConfig = (config) => {
    jsonProcessor.updateFilterConfig(config)
  }

  const addSelectedKey = (key) => {
    jsonProcessor.addSelectedKey(key)
  }

  const removeSelectedKey = (key) => {
    jsonProcessor.removeSelectedKey(key)
  }

  const clearSelectedKeys = () => {
    jsonProcessor.clearSelectedKeys()
  }

  // 计算属性 - 重新包装以确保响应性
  const hasValidJson = computed(() => jsonProcessor.hasValidJson)
  const canExecuteFilter = computed(() => jsonProcessor.canExecuteFilter)
  const hasErrors = computed(() => jsonProcessor.hasErrors)
  const latestError = computed(() => jsonProcessor.latestError)

  // 执行筛选
  const executeFilter = async () => {
    try {
      if (!canExecuteFilter.value) {
        return
      }

      jsonProcessor.setExecuting(true)

      // 生成筛选代码
      const code = generateFilterCode(jsonProcessor.state.filterConfig)

      // 执行筛选
      const result = await executeFilterCode(code, jsonProcessor.state.parsedJson)
      jsonProcessor.setTransformedJson(result)

      return result
    } catch (error) {
      jsonProcessor.addTransformError(error)
      handleError(error, '筛选执行')
      throw error
    } finally {
      jsonProcessor.setExecuting(false)
    }
  }

  // 防抖的自动执行筛选
  const debouncedExecuteFilter = debounce(executeFilter, 300)

  // 监听筛选配置变化，自动执行筛选
  watch(
    () => [
      jsonProcessor.state.filterConfig.selectedKeys,
      jsonProcessor.state.filterConfig.method,
      jsonProcessor.state.filterConfig.outputFormat,
      jsonProcessor.state.filterConfig.listPath,
      jsonProcessor.state.parsedJson,
    ],
    () => {
      if (jsonProcessor.state.filterConfig.autoExecute && canExecuteFilter.value) {
        debouncedExecuteFilter()
      }
    },
    { deep: true },
  )

  const context = {
    // 状态
    jsonState: jsonProcessor.state,

    // 方法
    updateJsonInput,
    executeFilter,
    clearAllErrors,
    getInputHistory,
    restoreFromHistory,
    updateFilterConfig,
    addSelectedKey,
    removeSelectedKey,
    clearSelectedKeys,

    // 计算属性 - 重新包装以确保响应性
    hasValidJson,
    canExecuteFilter,
    hasErrors,
    latestError,
  }

  provide(JSON_CONTEXT_KEY, context)
  return context
}
