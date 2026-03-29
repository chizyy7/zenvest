const GEMINI_API_KEY = 'AIzaSyCcZqHLgZZ_F1mjDXSMtKZzrEJL03LKkNc';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function sendMessageToGemini(userMessage) {
  const body = {
    contents: [
      {
        parts: [
          {
            text: `You are Zen, a friendly personal financial advisor for Zenvest app. 
Help users with budgeting, investments, savings and financial goals. 
Keep responses short, friendly and practical. Use emojis occasionally.

User message: ${userMessage}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500
    }
  };

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    console.log('Gemini status:', response.status);
    const data = await response.json();
    console.log('Gemini response:', data);

    if (data.error) {
      console.error('Gemini error:', data.error);
      return "Sorry, I'm having trouble right now. Try again! 🙏";
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text
      ?? "Sorry, I couldn't generate a response. Try again! 🙏";

  } catch (error) {
    console.error('Fetch error:', error);
    return "Connection issue. Please try again! 🙏";
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

// Aliases for HTML onclick handlers
window.sendAiMessage = sendMessage;
window.sendQuickMessage = function(message) {
  const input = document.querySelector('#ai-input')
    || document.querySelector('.ai-input')
    || document.querySelector('textarea');
  if (input) {
    input.value = message;
    sendMessage();
  } else {
    console.warn('sendQuickMessage: no AI input element found');
  }
};
