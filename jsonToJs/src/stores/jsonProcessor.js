import { defineStore } from 'pinia'
import { reactive, computed, readonly } from 'vue'

export const useJsonProcessorStore = defineStore('jsonProcessor', () => {
  // 状态定义
  const state = reactive({
    // 输入相关
    inputJson: '',
    inputHistory: [], // 输入历史记录

    // 解析相关
    parsedJson: null,
    parseErrors: [],

    // 筛选相关
    transformedJson: null,
    transformErrors: [],

    // 筛选配置
    filterConfig: {
      method: 'recursive', // 'specified' | 'recursive' - 默认使用递归筛选，更适合对象结构
      outputFormat: 'object', // 'object' | 'grouped' - 输出格式：对象格式或字段分组格式
      listPath: 'json', // 数组路径
      selectedKeys: [], // 已选字段
      autoExecute: true, // 自动执行

      // 高级筛选选项
      advanced: {
        // 去重配置
        deduplication: {
          enabled: false,
          fields: [], // 需要去重的字段列表
        },
        // 字段过滤配置
        fieldFilters: [
          // {
          //   field: 'name',
          //   type: 'contains', // 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex'
          //   value: '',
          //   caseSensitive: false
          // }
        ],
      },
    },

    // 执行状态
    isExecuting: false,
    lastExecutionTime: null,
  })

  // 数据验证函数
  const validateJsonInput = (input) => {
    if (typeof input !== 'string') {
      throw new Error('JSON输入必须是字符串类型')
    }
    if (input.length > 1024 * 1024) {
      // 1MB限制
      throw new Error('JSON数据过大，请减少数据量')
    }
    return true
  }

  // Actions with validation
  const setInputJson = (json) => {
    try {
      validateJsonInput(json)
      state.inputJson = json

      // 添加到历史记录
      if (state.inputHistory.length >= 10) {
        state.inputHistory.shift()
      }
      state.inputHistory.push({
        content: json,
        timestamp: Date.now(),
      })

      // 自动解析
      parseJson()
    } catch (error) {
      state.parseErrors.push({
        type: 'VALIDATION_ERROR',
        message: error.message,
        timestamp: Date.now(),
      })
    }
  }

  const parseJson = () => {
    try {
      state.parseErrors = []
      const parsed = JSON.parse(state.inputJson)
      state.parsedJson = parsed
    } catch (error) {
      state.parseErrors.push({
        type: 'PARSE_ERROR',
        message: error.message,
        timestamp: Date.now(),
      })
      state.parsedJson = null
    }
  }

  const setTransformedJson = (result) => {
    state.transformedJson = result
    state.lastExecutionTime = Date.now()
  }

  const updateFilterConfig = (config) => {
    Object.assign(state.filterConfig, config)
  }

  const addSelectedKey = (key) => {
    if (!state.filterConfig.selectedKeys.includes(key)) {
      state.filterConfig.selectedKeys.push(key)
    }
  }

  const removeSelectedKey = (key) => {
    const index = state.filterConfig.selectedKeys.indexOf(key)
    if (index > -1) {
      state.filterConfig.selectedKeys.splice(index, 1)
    }
  }

  const clearSelectedKeys = () => {
    state.filterConfig.selectedKeys = []
  }

  const setExecuting = (executing) => {
    state.isExecuting = executing
  }

  const addTransformError = (error) => {
    state.transformErrors.push({
      type: 'EXECUTION_ERROR',
      message: error.message,
      timestamp: Date.now(),
    })
  }

  const clearErrors = () => {
    state.parseErrors = []
    state.transformErrors = []
  }

  const clearHistory = () => {
    state.inputHistory = []
  }

  // Getters
  const hasValidJson = computed(() => state.parsedJson !== null && state.parseErrors.length === 0)

  const canExecuteFilter = computed(
    () => hasValidJson.value && state.filterConfig.selectedKeys.length > 0
  )

  const hasErrors = computed(() => state.parseErrors.length > 0 || state.transformErrors.length > 0)

  const latestError = computed(() => {
    const allErrors = [...state.parseErrors, ...state.transformErrors]
    return allErrors.length > 0 ? allErrors[allErrors.length - 1] : null
  })

  return {
    // State (readonly)
    state: readonly(state),

    // Actions
    setInputJson,
    parseJson,
    setTransformedJson,
    setExecuting,
    addTransformError,
    clearErrors,
    clearHistory,
    updateFilterConfig,
    addSelectedKey,
    removeSelectedKey,
    clearSelectedKeys,

    // Getters
    hasValidJson,
    canExecuteFilter,
    hasErrors,
    latestError,
  }
})
