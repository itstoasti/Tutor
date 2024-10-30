import { Auth } from './auth.js';

const auth = new Auth();
await auth.init();

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'askAboutSelection',
    title: 'Ask about selected text',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'askAboutSelection') {
    if (!await auth.checkSubscription()) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showSubscriptionRequired'
      });
      return;
    }

    const selectedText = info.selectionText;
    chrome.tabs.sendMessage(tab.id, {
      action: 'processSelection',
      text: selectedText
    });
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'capture-screen') {
    if (!await auth.checkSubscription()) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, {
        action: 'showSubscriptionRequired'
      });
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['src/css/capture.css']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/js/capture.js']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        window.startScreenCapture();
      }
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAuthStatus') {
    sendResponse({
      user: auth.user,
      subscription: auth.subscriptionStatus,
      remainingUsage: auth.getRemainingUsage()
    });
    return true;
  }

  if (request.action === 'login') {
    auth.login()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'logout') {
    auth.logout()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'startTrial') {
    auth.startTrial()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'captureScreen') {
    chrome.tabs.captureVisibleTab(
      null,
      { format: 'png' },
      (dataUrl) => {
        sendResponse(dataUrl);
      }
    );
    return true;
  }
  
  if (request.action === 'analyzeImage') {
    // Get the API key from storage
    chrome.storage.local.get(['openai_key'], async (result) => {
      try {
        // Convert data URL to base64
        const base64Image = request.imageData.split(',')[1];
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${result.openai_key}`
          },
          body: JSON.stringify({
            model: "gpt-4-turbo",
            messages: [{
              role: "user",
              content: [{
                type: "text",
                text: "Analyze this image. If it contains a question, start your response with 'Question:' followed by the question text on a new line, then 'Answer:' followed by the answer on a new line. If it's not a question, just describe what you see."
              }, {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              }]
            }],
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const error = await response.json();
          let errorMessage = error.error?.message || 'Failed to analyze image';
          sendResponse({ error: errorMessage });
          return;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Format the response with HTML for better display
        const formattedContent = content
          .replace('Question:', '<strong>Question:</strong>')
          .replace('Answer:', '<br><strong>Answer:</strong>')
          .replace(/\n/g, '<br>');
        
        sendResponse({ answer: formattedContent });
      } catch (error) {
        let errorMessage = error.message || 'Failed to analyze image';
        sendResponse({ error: errorMessage });
      }
    });
    return true;
  }
});