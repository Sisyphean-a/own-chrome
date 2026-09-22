import { ref } from 'vue'

// 全局事件总线
const eventBus = ref(new Map())

export function useEventBus() {
  const emit = (event, data) => {
    const handlers = eventBus.value.get(event) || []
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Event handler error for ${event}:`, error)
      }
    })
  }

  const on = (event, handler) => {
    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function')
    }
    
    const handlers = eventBus.value.get(event) || []
    handlers.push(handler)
    eventBus.value.set(event, handlers)
    
    // 返回取消订阅函数
    return () => {
      const currentHandlers = eventBus.value.get(event) || []
      const index = currentHandlers.indexOf(handler)
      if (index > -1) {
        currentHandlers.splice(index, 1)
        eventBus.value.set(event, currentHandlers)
      }
    }
  }

  const off = (event, handler) => {
    const handlers = eventBus.value.get(event) || []
    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
      eventBus.value.set(event, handlers)
    }
  }

  const once = (event, handler) => {
    const unsubscribe = on(event, (data) => {
      handler(data)
      unsubscribe()
    })
    return unsubscribe
  }

  const clear = (event) => {
    if (event) {
      eventBus.value.delete(event)
    } else {
      eventBus.value.clear()
    }
  }

  const getListenerCount = (event) => {
    const handlers = eventBus.value.get(event) || []
    return handlers.length
  }

  return { 
    emit, 
    on, 
    off, 
    once, 
    clear, 
    getListenerCount 
  }
}

// 预定义事件类型
export const EVENTS = {
  JSON_UPDATED: 'json:updated',
  JSON_PARSED: 'json:parsed',
  CODE_EXECUTED: 'code:executed',
  CODE_CHANGED: 'code:changed',
  ERROR_OCCURRED: 'error:occurred',
  ERROR_CLEARED: 'error:cleared',
  UI_STATE_CHANGED: 'ui:state-changed',
  DIALOG_OPENED: 'dialog:opened',
  DIALOG_CLOSED: 'dialog:closed',
  PREFERENCES_UPDATED: 'preferences:updated'
}
