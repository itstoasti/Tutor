chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'askAboutSelection',
    title: 'Ask about selected text',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'askAboutSelection') {
    const selectedText = info.selectionText;
    chrome.runtime.sendMessage({
      action: 'processSelection',
      text: selectedText
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureScreen') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      // Here you would typically send this to a vision API
      // For now, we'll just notify that the feature is coming soon
      chrome.runtime.sendMessage({
        action: 'showNotification',
        message: 'Image analysis feature coming soon!'
      });
    });
  }
});