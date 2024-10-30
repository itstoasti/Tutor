// Create and inject the floating answer box styles
const style = document.createElement('style');
style.textContent = `
  .study-assistant-answer {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 400px;
    width: 90%;
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 1000001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .study-assistant-content {
    margin-bottom: 12px;
    font-size: 14px;
    line-height: 1.5;
    color: #1e293b;
    max-height: 300px;
    overflow-y: auto;
  }

  .study-assistant-close {
    padding: 6px 12px;
    background: #e2e8f0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: #1e293b;
    display: block;
    margin-left: auto;
  }

  .study-assistant-close:hover {
    background: #cbd5e1;
  }

  .study-assistant-loading {
    display: flex;
    align-items: center;
    gap: 12px;
    justify-content: center;
    padding: 20px;
  }

  .study-assistant-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top: 2px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Create answer box element
let answerBox = null;

function createAnswerBox() {
  if (answerBox) {
    answerBox.remove();
  }

  answerBox = document.createElement('div');
  answerBox.className = 'study-assistant-answer';
  document.body.appendChild(answerBox);
  return answerBox;
}

function showLoading() {
  const box = createAnswerBox();
  box.innerHTML = `
    <div class="study-assistant-loading">
      <div class="study-assistant-spinner"></div>
      <div>Analyzing...</div>
    </div>
  `;
}

function showAnswer(content) {
  const box = createAnswerBox();
  box.innerHTML = `
    <div class="study-assistant-content">${content}</div>
    <button class="study-assistant-close">Close</button>
  `;

  const closeButton = box.querySelector('.study-assistant-close');
  closeButton.addEventListener('click', () => {
    box.remove();
    answerBox = null;
  });

  // Close on escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape' && answerBox) {
      answerBox.remove();
      answerBox = null;
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'processSelection') {
    showLoading();
    
    try {
      // Get API key from storage
      const { openai_key } = await chrome.storage.local.get(['openai_key']);
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openai_key}`
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: [{
            role: "user",
            content: request.text
          }],
          max_tokens: 500
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get answer');
      }

      showAnswer(data.choices[0].message.content);
    } catch (error) {
      showAnswer(`Error: ${error.message}`);
    }
  }
});