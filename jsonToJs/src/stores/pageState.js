import { reactive, computed, readonly } from 'vue'
import { defineStore } from 'pinia'
import { useJsonProcessorStore } from './jsonProcessor.js'

export const usePageStateStore = defineStore('pageState', () => {
  // 使用组合其他stores
  const jsonProcessor = useJsonProcessorStore()

  // 页面特定状态
  const uiState = reactive({
    // 布局状态
    columnWidths: [30, 40, 30], // 百分比
    inputAreaHeight: 60,

    // 对话框状态
    showAIDialog: false,
    showCommonCodeDialog: false,

    // 用户偏好
    preferences: {
      theme: 'light',
      fontSize: 14,
      autoSave: true,
    },

    // 初始化状态
    isInitialized: false,
  })

  // 默认数据
  const defaultJson = {
    name: '张三',
    age: 18,
    gender: '男',
    address: {
      province: '北京',
      city: '北京',
      district: '朝阳区',
    },
  }

  // 持久化状态
  const savePreferences = () => {
    try {
      localStorage.setItem('jsontojs_preferences', JSON.stringify(uiState.preferences))
    } catch (error) {
      console.warn('保存用户偏好失败:', error)
    }
  }

  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem('jsontojs_preferences')
      if (saved) {
        Object.assign(uiState.preferences, JSON.parse(saved))
      }
    } catch (error) {
      console.warn('加载用户偏好失败:', error)
    }
  }

  // 初始化页面
  const initJsonPage = () => {
    if (!uiState.isInitialized) {
      // 加载用户偏好
      loadPreferences()

      // 设置默认JSON数据
      const defaultJsonString = JSON.stringify(defaultJson, null, 2)
      jsonProcessor.setInputJson(defaultJsonString)

      // 不设置默认转换结果，保持右侧为空

      uiState.isInitialized = true
    }
  }

  // UI Actions
  const updateColumnWidths = (widths) => {
    uiState.columnWidths = widths
  }

  const updateInputHeight = (height) => {
    uiState.inputAreaHeight = height
  }

  const toggleAIDialog = () => {
    uiState.showAIDialog = !uiState.showAIDialog
  }

  const toggleCommonCodeDialog = () => {
    uiState.showCommonCodeDialog = !uiState.showCommonCodeDialog
  }

  const updatePreferences = (newPreferences) => {
    Object.assign(uiState.preferences, newPreferences)
    savePreferences()
  }

  // 兼容性方法（保持向后兼容）
  const getJsonPageState = computed(() => ({
    jsonInput: jsonProcessor.state.inputJson,
    json: jsonProcessor.state.parsedJson,
    transformedJson: jsonProcessor.state.transformedJson,
    isInitialized: uiState.isInitialized,
  }))

  const updateJsonInput = (value) => {
    jsonProcessor.setInputJson(value)
  }

  const updateJson = (value) => {
    // 这个方法现在通过jsonProcessor自动处理
    console.warn('updateJson is deprecated, use jsonProcessor.setInputJson instead')
  }

  const updateTransformedJson = (value) => {
    jsonProcessor.setTransformedJson(value)
  }

  return {
    // 组合状态
    jsonProcessor,
    uiState: readonly(uiState),

    // UI Actions
    updateColumnWidths,
    updateInputHeight,
    toggleAIDialog,
    toggleCommonCodeDialog,
    updatePreferences,

    // 持久化
    savePreferences,
    loadPreferences,

    // 初始化
    initJsonPage,

    // 兼容性方法
    getJsonPageState,
    updateJsonInput,
    updateJson,
    updateTransformedJson,
  }
})
