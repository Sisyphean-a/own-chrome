/**
 * 应用配置常量
 * 统一管理应用级别的配置参数
 */

export const APP_CONFIG = {
  // 应用信息
  app: {
    name: 'JsonToJs',
    version: '1.0.0',
    description: 'JSON转换工具',
  },

  // JSON处理配置
  json: {
    // 默认JSON数据
    defaultData: {
      name: '张三',
      age: 18,
      gender: '男',
      address: {
        province: '北京',
        city: '北京',
        district: '朝阳区',
      },
    },

    // 默认转换结果（置空）
    defaultTransformed: null,

    // JSON视图配置
    view: {
      fontSize: 18,
      maxExpandDepth: 3,
      batchSize: 50, // 批量渲染大小
    },
  },

  // 布局配置
  layout: {
    // 列数配置
    columns: {
      default: 3,
      min: 2,
      max: 4,
    },

    // 行数配置
    rows: {
      default: 2,
      min: 1,
      max: 3,
    },

    // 折叠配置
    collapse: {
      column: {
        percentage: 4,
        minExpanded: 10,
      },
      row: {
        percentage: 8,
        minExpanded: 15,
      },
    },
  },

  // 性能配置
  performance: {
    // 防抖延迟
    debounce: {
      default: 300,
      search: 150,
      resize: 100,
    },

    // 虚拟滚动
    virtualScroll: {
      itemHeight: 24,
      bufferSize: 10,
    },

    // 批量处理
    batch: {
      size: 100,
      delay: 16, // 约60fps
    },
  },

  // 存储配置
  storage: {
    // localStorage键名
    keys: {
      apiKey: 'jsontojs_api_key',
      userPreferences: 'jsontojs_preferences',
      recentFiles: 'jsontojs_recent_files',
      editorState: 'jsontojs_editor_state',
    },

    // 存储限制
    limits: {
      maxRecentFiles: 10,
      maxFileSize: 1024 * 1024, // 1MB
    },
  },

  // 错误处理配置
  error: {
    // 错误类型
    types: {
      PARSE_ERROR: 'PARSE_ERROR',
      EXECUTION_ERROR: 'EXECUTION_ERROR',
      NETWORK_ERROR: 'NETWORK_ERROR',
      VALIDATION_ERROR: 'VALIDATION_ERROR',
    },

    // 错误显示配置
    display: {
      maxErrors: 5,
      autoHideDelay: 5000, // 5秒后自动隐藏
    },
  },

  // 开发配置
  development: {
    // 调试模式
    debug: process.env.NODE_ENV === 'development',

    // 日志级别
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',

    // 性能监控
    performance: {
      enabled: process.env.NODE_ENV === 'development',
      sampleRate: 0.1, // 10%采样率
    },
  },
}

// 导出便捷访问的子配置
export const JSON_CONFIG = APP_CONFIG.json
export const LAYOUT_CONFIG = APP_CONFIG.layout
export const PERFORMANCE_CONFIG = APP_CONFIG.performance
export const STORAGE_CONFIG = APP_CONFIG.storage
export const ERROR_CONFIG = APP_CONFIG.error

// 默认导出
export default APP_CONFIG
