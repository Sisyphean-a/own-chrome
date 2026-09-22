/**
 * UI配置常量
 * 统一管理颜色、尺寸、动画等UI相关的配置
 */

export const UI_CONFIG = {
  // 颜色配置
  colors: {
    // 背景色
    background: {
      primary: 'var(--bg-primary)',
      secondary: 'var(--bg-secondary)',
      tertiary: 'var(--bg-tertiary)',
      // 兼容旧的硬编码颜色
      light: '#fafafa',
      border: '#e0e0e0',
    },

    // 边框色
    border: {
      light: 'var(--border-light)',
      medium: 'var(--border-medium)',
      // 兼容旧的硬编码颜色
      default: '#e0e0e0',
    },

    // 主题色
    primary: {
      main: 'var(--color-primary-600)',
      // 兼容旧的硬编码颜色
      blue: '#1976d2',
    },

    // 文本色
    text: {
      primary: 'var(--text-primary)',
      secondary: 'var(--text-secondary)',
      inverse: 'var(--text-inverse)',
    },

    // 错误色
    error: {
      main: 'var(--color-error)',
      light: 'var(--color-error-light)',
    },
  },

  // 尺寸配置
  dimensions: {
    // 默认尺寸
    defaultInputHeight: 60,
    resizeHandleSize: 6,
    minColumnWidth: 200,

    // 折叠相关尺寸
    collapsedWidth: {
      percentage: 4,
      minExpanded: 10,
    },
    collapsedHeight: {
      percentage: 8,
      minExpanded: 15,
    },

    // 头部高度
    header: {
      column: 35,
      row: 30,
    },

    // 间距
    spacing: {
      xs: 'var(--spacing-xs)',
      sm: 'var(--spacing-sm)',
      md: 'var(--spacing-md)',
      lg: 'var(--spacing-lg)',
      xl: 'var(--spacing-xl)',
      '2xl': 'var(--spacing-2xl)',
      '4xl': 'var(--spacing-4xl)',
    },

    // 圆角
    radius: {
      xs: 'var(--radius-xs)',
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
    },
  },

  // 动画配置
  animations: {
    // 过渡时间
    transition: {
      fast: 'var(--transition-fast)',
      normal: 'var(--transition-normal)',
      slow: 'var(--transition-slow)',
      // 兼容旧的硬编码时间
      default: '0.2s',
    },

    // 缓动函数
    easing: {
      default: 'ease-in-out',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },

    // 具体动画时长
    duration: {
      collapse: 300, // 折叠动画时长（毫秒）
      resize: 200, // 调整大小动画时长（毫秒）
      hover: 150, // 悬停效果时长（毫秒）
    },
  },

  // Z-index层级
  zIndex: {
    dropdown: 'var(--z-dropdown)',
    sticky: 'var(--z-sticky)',
    modal: 'var(--z-modal)',
    tooltip: 'var(--z-tooltip)',
    // 具体数值
    resizeHandle: 1,
    header: 10,
    overlay: 100,
  },

  // 字体配置
  typography: {
    family: {
      mono: 'var(--font-family-mono)',
      sans: 'var(--font-family-sans)',
    },
    size: {
      xs: 'var(--font-size-xs)',
      sm: 'var(--font-size-sm)',
      base: 'var(--font-size-base)',
      md: 'var(--font-size-md)',
      lg: 'var(--font-size-lg)',
      xl: 'var(--font-size-xl)',
      '2xl': 'var(--font-size-2xl)',
    },
    weight: {
      normal: 'var(--font-weight-normal)',
      medium: 'var(--font-weight-medium)',
      semibold: 'var(--font-weight-semibold)',
      bold: 'var(--font-weight-bold)',
    },
  },

  // 效果配置
  effects: {
    backdrop: {
      blur: 'var(--backdrop-blur)',
    },
    shadow: {
      sm: 'var(--shadow-sm)',
      md: 'var(--shadow-md)',
      lg: 'var(--shadow-lg)',
    },
    glass: {
      background: 'var(--glass-bg)',
      border: 'var(--glass-border)',
    },
  },
}

// 导出便捷访问的子配置
export const COLORS = UI_CONFIG.colors
export const DIMENSIONS = UI_CONFIG.dimensions
export const ANIMATIONS = UI_CONFIG.animations
export const TYPOGRAPHY = UI_CONFIG.typography
export const EFFECTS = UI_CONFIG.effects

// 默认导出
export default UI_CONFIG
