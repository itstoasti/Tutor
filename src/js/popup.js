import { callOpenAI, validateApiKey } from './api.js';

let apiKey = '';
let keyValidationTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved API key
  const saved = await chrome.storage.local.get(['openai_key']);
  if (saved.openai_key) {
    apiKey = saved.openai_key;
    document.getElementById('apiKey').value = apiKey;
    await validateAndUpdateUI(apiKey);
  }

  // Event Listeners
  document.getElementById('apiKey').addEventListener('input', handleApiKeyInput);
  document.getElementById('saveKey').addEventListener('click', saveApiKey);
  document.getElementById('askButton').addEventListener('click', handleQuestion);
  document.getElementById('captureButton').addEventListener('click', handleCapture);

  // Initialize button states
  updateButtonStates();
});

async function handleApiKeyInput(e) {
  const key = e.target.value.trim();
  
  if (keyValidationTimeout) {
    clearTimeout(keyValidationTimeout);
  }

  document.getElementById('keyStatus').className = 'key-status';
  document.getElementById('keyMessage').className = 'key-message';
  
  keyValidationTimeout = setTimeout(() => validateAndUpdateUI(key), 500);
}

async function validateAndUpdateUI(key) {
  if (!key) {
    updateValidationUI(false, 'API key is required');
    return false;
  }

  try {
    const result = await validateApiKey(key);
    updateValidationUI(result.isValid, result.error);
    return result.isValid;
  } catch (error) {
    updateValidationUI(false, 'Error validating API key');
    return false;
  }
}

function updateValidationUI(isValid, message) {
  const keyStatus = document.getElementById('keyStatus');
  const keyMessage = document.getElementById('keyMessage');
  const saveButton = document.getElementById('saveKey');
  const apiKeyInput = document.getElementById('apiKey');

  keyStatus.className = `key-status show ${isValid ? 'valid' : 'invalid'}`;
  keyMessage.className = `key-message show ${isValid ? 'success' : 'error'}`;
  keyMessage.textContent = message || (isValid ? 'API key is valid' : 'Invalid API key');
  apiKeyInput.className = isValid ? 'valid' : 'invalid';
  saveButton.disabled = !isValid;
  
  updateButtonStates();
}

async function saveApiKey() {
  const key = document.getElementById('apiKey').value.trim();
  if (!key) return;

  const isValid = await validateAndUpdateUI(key);
  if (isValid) {
    await chrome.storage.local.set({ openai_key: key });
    apiKey = key;
    document.getElementById('apiKeySection').style.display = 'none';
    updateButtonStates();
  }
}

function updateButtonStates() {
  const hasKey = !!apiKey;
  const hasQuestion = !!document.getElementById('questionInput').value.trim();
  
  document.getElementById('askButton').disabled = !hasKey || !hasQuestion;
  document.getElementById('captureButton').disabled = !hasKey;
}

async function handleQuestion() {
  const question = document.getElementById('questionInput').value.trim();
  if (!question) return;

  showLoading(true);
  try {
    const answer = await callOpenAI(question);
    document.getElementById('answer').textContent = answer;
  } catch (error) {
    document.getElementById('answer').textContent = `Error: ${error.message}`;
  } finally {
    showLoading(false);
  }
}

async function handleCapture() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Close the popup to prevent interference
    window.close();
    
    // Inject the capture CSS first
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['src/css/capture.css']
    });

    // Then inject and execute the capture script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/js/capture.js']
    });

    // Initialize the capture
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        window.startScreenCapture();
      }
    });

  } catch (error) {
    console.error('Capture error:', error);
    document.getElementById('answer').textContent = `Error: ${error.message}`;
  }
}

function showLoading(show) {
  document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
  document.getElementById('answer').style.display = show ? 'none' : 'block';
}

document.getElementById('questionInput')?.addEventListener('input', updateButtonStates);