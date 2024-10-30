// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    sendResponse({ text: window.getSelection().toString() });
  }
});

// Create and inject the floating answer box
const answerBox = document.createElement('div');
answerBox.id = 'study-assistant-answer';
answerBox.style.display = 'none';
document.body.appendChild(answerBox);

// Handle text selection
document.addEventListener('mouseup', () => {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    // Show the answer box near the selection
    const range = window.getSelection().getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    answerBox.style.position = 'fixed';
    answerBox.style.top = `${rect.bottom + window.scrollY + 10}px`;
    answerBox.style.left = `${rect.left + window.scrollX}px`;
  }
});