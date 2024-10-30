import { callOpenAI } from './js/api.js';
import { ScreenCapture } from './js/capture.js';

let apiKey = '';

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved API key
  const saved = await chrome.storage.local.get(['openai_key']);
  if (saved.openai_key) {
    apiKey = saved.openai_key;
    document.getElementById('apiKeySection').style.display = 'none';
  }

  // Event Listeners
  document.getElementById('saveKey').addEventListener('click', saveApiKey);
  document.getElementById('askButton').addEventListener('click', handleQuestion);
  document.getElementById('captureButton').addEventListener('click', handleCapture);
});

async function saveApiKey() {
  const key = document.getElementById('apiKey').value.trim();
  if (key) {
    await chrome.storage.local.set({ openai_key: key });
    apiKey = key;
    document.getElementById('apiKeySection').style.display = 'none';
  }
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
    // Minimize popup
    document.body.style.opacity = '0';
    
    // Execute content script for screen capture
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['js/capture.js']
    });

    // Inject capture CSS
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['css/capture.css']
    });

    // Initialize capture
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: async () => {
        const capture = new ScreenCapture();
        await capture.initialize();
        return await capture.endCapture();
      }
    });

    // Restore popup
    document.body.style.opacity = '1';

    if (results[0].result) {
      showLoading(true);
      const imageData = results[0].result;
      const answer = await callOpenAI("What's in this image?", imageData);
      document.getElementById('answer').textContent = answer;
    }
  } catch (error) {
    document.getElementById('answer').textContent = `Error: ${error.message}`;
  } finally {
    showLoading(false);
  }
}

function showLoading(show) {
  document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
  document.getElementById('answer').style.display = show ? 'none' : 'block';
}