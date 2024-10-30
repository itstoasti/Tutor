// API handling module
const API_BASE = 'https://api.studyassistant.pro';

export async function callOpenAI(prompt, image = null) {
  try {
    const { token } = await chrome.storage.local.get(['token']);
    if (!token) {
      throw new Error('Please sign in to use this feature');
    }

    const messages = [];
    
    if (image) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt || "What's in this image?" },
          {
            type: "image_url",
            image_url: {
              url: image
            }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: prompt
      });
    }

    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model: image ? "gpt-4-turbo" : "gpt-4-turbo",
        messages: messages,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get response');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    throw new Error(`Error: ${error.message}`);
  }
}