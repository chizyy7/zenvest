const GEMINI_API_KEY = 'AIzaSyCcZqHLgZZ_F1mjDXSMtKZzrEJL03LKkNc';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are Zen, a friendly and knowledgeable personal financial advisor inside the Zenvest app. 
You help users with:
- Budget tracking and spending analysis
- Investment recommendations
- Savings strategies
- Financial goal setting
- Understanding their net worth

Keep responses concise, friendly and actionable.
Always relate advice to personal finance.
Use emojis occasionally to stay friendly.
Never give specific stock picks — give general advice.
If asked something unrelated to finance, politely redirect.`;

let chatHistory = [];

async function sendMessageToGemini(userMessage) {
  chatHistory.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: chatHistory
  };

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error('Gemini API error: ' + response.status);
    }

    const data = await response.json();
    const reply = data.candidates[0].content.parts[0].text;

    chatHistory.push({
      role: 'model',
      parts: [{ text: reply }]
    });

    return reply;

  } catch (error) {
    console.error('Gemini error:', error);
    return "I'm having a moment — let me gather my thoughts. Try asking again! 🙏";
  }
}

// Keep chat history to max 20 messages to save tokens
function trimChatHistory() {
  if (chatHistory.length > 20) {
    chatHistory = chatHistory.slice(-20);
  }
}

async function sendMessage() {
  const input = document.querySelector('#ai-input') 
    || document.querySelector('.ai-input');
  const messagesContainer = document.querySelector('#ai-messages')
    || document.querySelector('.ai-messages')
    || document.querySelector('.chat-messages');

  if (!input || !input.value.trim()) return;

  const userMessage = input.value.trim();
  input.value = '';

  // Show user message
  appendMessage('user', userMessage, messagesContainer);

  // Show typing indicator
  const typingEl = showTypingIndicator(messagesContainer);

  // Get Gemini response
  trimChatHistory();
  const reply = await sendMessageToGemini(userMessage);

  // Remove typing indicator and show reply
  typingEl?.remove();
  appendMessage('zen', reply, messagesContainer);

  // Scroll to bottom
  messagesContainer?.scrollTo({ 
    top: messagesContainer.scrollHeight, 
    behavior: 'smooth' 
  });
}

function appendMessage(role, text, container) {
  if (!container) return;
  const div = document.createElement('div');
  div.className = role === 'user' ? 'message user-message' : 'message zen-message';
  const p = document.createElement('p');
  p.textContent = text;
  if (role !== 'user') {
    const avatar = document.createElement('div');
    avatar.className = 'zen-avatar';
    avatar.textContent = '🤖';
    div.appendChild(avatar);
  }
  div.appendChild(p);
  container.appendChild(div);
}

function showTypingIndicator(container) {
  if (!container) return null;
  const div = document.createElement('div');
  div.className = 'message zen-message typing-indicator';
  div.innerHTML = '<p>Zen is thinking... 💭</p>';
  container.appendChild(div);
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  return div;
}

// Wire up send button and Enter key
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.querySelector('#send-btn')
    || document.querySelector('.send-btn')
    || document.querySelector('[data-action="send"]');
  
  const input = document.querySelector('#ai-input')
    || document.querySelector('.ai-input');

  sendBtn?.addEventListener('click', sendMessage);
  
  input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Wire up suggestion chips
  document.querySelectorAll('.suggestion-chip, .chat-suggestion').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.querySelector('#ai-input') 
        || document.querySelector('.ai-input');
      if (input) {
        input.value = chip.textContent.trim();
        sendMessage();
      }
    });
  });
});

// Export for use in other modules
export { sendMessage, sendMessageToGemini };
