// API handling module
export async function callOpenAI(prompt, image = null) {
  try {
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getApiKey()}`
      },
      body: JSON.stringify({
        model: image ? "gpt-4-vision-preview" : "gpt-4",
        messages: messages,
        max_tokens: 500
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.choices[0].message.content;
  } catch (error) {
    throw new Error(`API Error: ${error.message}`);
  }
}

export async function getApiKey() {
  const result = await chrome.storage.local.get(['openai_key']);
  return result.openai_key;
}