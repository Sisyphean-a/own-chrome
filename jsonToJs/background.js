// Chrome扩展后台脚本
chrome.runtime.onInstalled.addListener(() => {
  console.log('JsonToJs扩展已安装')
})

// 处理扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 打开新标签页显示JsonToJs工具
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html'),
  })
  console.log('JsonToJs扩展被点击，打开新标签页')
})

// 监听来自content script或popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStorageData') {
    // 获取存储的数据
    chrome.storage.local.get(request.keys, (result) => {
      sendResponse(result)
    })
    return true // 保持消息通道开放
  }

  if (request.action === 'setStorageData') {
    // 设置存储数据
    chrome.storage.local.set(request.data, () => {
      sendResponse({ success: true })
    })
    return true
  }
})
