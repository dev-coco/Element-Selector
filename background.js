chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.i18n.getMessage('tutorial') })
  }
})

chrome.action.onClicked.addListener(tab => {
  if (tab.url.includes('http')) {
    chrome.tabs.sendMessage(tab.id, { action: 'activate' })
  }
})
