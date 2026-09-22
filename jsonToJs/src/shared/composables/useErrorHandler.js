/**
 * 统一错误处理组合式函数
 * 提供全局错误处理、错误收集、错误显示等功能
 */

import { ref, reactive, computed, readonly } from 'vue'
import { ERROR_CONFIG } from '@/shared/constants/app-config.js'

// 全局错误状态
const globalErrors = ref([])
const errorStats = reactive({
  total: 0,
  byType: {},
  recent: [],
})

/**
 * 错误处理组合式函数
 * @param {Object} options 配置选项
 * @returns {Object} 错误处理相关的方法和状态
 */
export function useErrorHandler(options = {}) {
  const {
    maxErrors = ERROR_CONFIG.display.maxErrors,
    autoHideDelay = ERROR_CONFIG.display.autoHideDelay,
    context = 'Unknown',
  } = options

  // 本地错误状态
  const errors = ref([])
  const isLoading = ref(false)
  const hasErrors = computed(() => errors.value.length > 0)
  const latestError = computed(() => errors.value[errors.value.length - 1] || null)

  /**
   * 生成错误ID
   * @returns {string} 唯一错误ID
   */
  const generateErrorId = () => {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 格式化错误信息
   * @param {Error|string} error 错误对象或错误消息
   * @param {string} context 错误上下文
   * @param {Object} metadata 额外的元数据
   * @returns {Object} 格式化后的错误对象
   */
  const formatError = (error, context = '', metadata = {}) => {
    const errorInfo = {
      id: generateErrorId(),
      message: typeof error === 'string' ? error : error.message || '未知错误',
      type: getErrorType(error),
      context: context || 'Unknown',
      timestamp: new Date(),
      stack: error?.stack || null,
      metadata,
      severity: getSeverity(error),
    }

    return errorInfo
  }

  /**
   * 获取错误类型
   * @param {Error|string} error 错误对象
   * @returns {string} 错误类型
   */
  const getErrorType = (error) => {
    if (typeof error === 'string') {
      return ERROR_CONFIG.types.VALIDATION_ERROR
    }

    if (error instanceof SyntaxError) {
      return ERROR_CONFIG.types.PARSE_ERROR
    }

    if (error instanceof TypeError || error instanceof ReferenceError) {
      return ERROR_CONFIG.types.EXECUTION_ERROR
    }

    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return ERROR_CONFIG.types.NETWORK_ERROR
    }

    return ERROR_CONFIG.types.EXECUTION_ERROR
  }

  /**
   * 获取错误严重程度
   * @param {Error|string} error 错误对象
   * @returns {string} 严重程度
   */
  const getSeverity = (error) => {
    const type = getErrorType(error)

    switch (type) {
      case ERROR_CONFIG.types.NETWORK_ERROR:
        return 'high'
      case ERROR_CONFIG.types.PARSE_ERROR:
        return 'medium'
      case ERROR_CONFIG.types.EXECUTION_ERROR:
        return 'medium'
      case ERROR_CONFIG.types.VALIDATION_ERROR:
        return 'low'
      default:
        return 'medium'
    }
  }

  /**
   * 处理错误
   * @param {Error|string} error 错误对象或错误消息
   * @param {string} errorContext 错误上下文
   * @param {Object} metadata 额外的元数据
   * @returns {Object} 格式化后的错误对象
   */
  const handleError = (error, errorContext = context, metadata = {}) => {
    const errorInfo = formatError(error, errorContext, metadata)

    // 添加到本地错误列表
    errors.value.push(errorInfo)

    // 添加到全局错误列表
    globalErrors.value.push(errorInfo)

    // 更新统计信息
    updateErrorStats(errorInfo)

    // 限制错误数量
    if (errors.value.length > maxErrors) {
      errors.value.shift()
    }

    if (globalErrors.value.length > maxErrors * 2) {
      globalErrors.value.shift()
    }

    // 控制台输出
    logError(errorInfo)

    // 自动隐藏（如果配置了）
    if (autoHideDelay > 0) {
      setTimeout(() => {
        removeError(errorInfo.id)
      }, autoHideDelay)
    }

    return errorInfo
  }

  /**
   * 更新错误统计
   * @param {Object} errorInfo 错误信息
   */
  const updateErrorStats = (errorInfo) => {
    errorStats.total++
    errorStats.byType[errorInfo.type] = (errorStats.byType[errorInfo.type] || 0) + 1
    errorStats.recent.push({
      id: errorInfo.id,
      type: errorInfo.type,
      context: errorInfo.context,
      timestamp: errorInfo.timestamp,
    })

    // 只保留最近的50个错误记录
    if (errorStats.recent.length > 50) {
      errorStats.recent.shift()
    }
  }

  /**
   * 记录错误到控制台
   * @param {Object} errorInfo 错误信息
   */
  const logError = (errorInfo) => {
    const logMethod = errorInfo.severity === 'high' ? 'error' : 'warn'
    console[logMethod](`[${errorInfo.context}] ${errorInfo.message}`, {
      type: errorInfo.type,
      timestamp: errorInfo.timestamp,
      stack: errorInfo.stack,
      metadata: errorInfo.metadata,
    })
  }

  /**
   * 移除指定错误
   * @param {string} errorId 错误ID
   */
  const removeError = (errorId) => {
    const index = errors.value.findIndex((error) => error.id === errorId)
    if (index !== -1) {
      errors.value.splice(index, 1)
    }

    const globalIndex = globalErrors.value.findIndex((error) => error.id === errorId)
    if (globalIndex !== -1) {
      globalErrors.value.splice(globalIndex, 1)
    }
  }

  /**
   * 清除所有错误
   */
  const clearErrors = () => {
    errors.value = []
  }

  /**
   * 清除全局错误
   */
  const clearGlobalErrors = () => {
    globalErrors.value = []
    errorStats.total = 0
    errorStats.byType = {}
    errorStats.recent = []
  }

  /**
   * 异步操作包装器
   * @param {Function} asyncFn 异步函数
   * @param {string} operationContext 操作上下文
   * @returns {Function} 包装后的函数
   */
  const withErrorHandling = (asyncFn, operationContext = 'Async Operation') => {
    return async (...args) => {
      isLoading.value = true
      try {
        const result = await asyncFn(...args)
        return result
      } catch (error) {
        handleError(error, operationContext, { args })
        throw error
      } finally {
        isLoading.value = false
      }
    }
  }

  /**
   * 获取错误摘要
   * @returns {Object} 错误摘要信息
   */
  const getErrorSummary = () => {
    return {
      total: errors.value.length,
      byType: errors.value.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1
        return acc
      }, {}),
      bySeverity: errors.value.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1
        return acc
      }, {}),
      latest: latestError.value,
    }
  }

  return {
    // 状态
    errors: readonly(errors),
    isLoading: readonly(isLoading),
    hasErrors,
    latestError,

    // 方法
    handleError,
    removeError,
    clearErrors,
    withErrorHandling,
    getErrorSummary,

    // 全局状态（只读）
    globalErrors: readonly(globalErrors),
    errorStats: readonly(errorStats),
    clearGlobalErrors,
  }
}

// 导出全局错误状态（用于跨组件访问）
export const useGlobalErrors = () => {
  return {
    globalErrors: readonly(globalErrors),
    errorStats: readonly(errorStats),
    clearGlobalErrors: () => {
      globalErrors.value = []
      errorStats.total = 0
      errorStats.byType = {}
      errorStats.recent = []
    },
  }
}

// 默认导出
export default useErrorHandler
