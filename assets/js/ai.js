const GEMINI_KEY = 'AIzaSyCcZqHLgZZ_F1mjDXSMtKZzrEJL03LKkNc';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_KEY;

async function callGemini(message) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: 'You are Zen, a friendly financial advisor for Zenvest. Answer this: ' + message
        }]
      }]
    })
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.candidates[0].content.parts[0].text;
}

function appendMessage(container, text, cssClass, id) {
  const div = document.createElement('div');
  div.className = cssClass;
  if (id) div.id = id;
  const p = document.createElement('p');
  p.textContent = text;
  div.appendChild(p);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

window.sendAiMessage = async function() {
  const input = document.querySelector('#ai-input');
  const messages = document.querySelector('#ai-messages') 
    || document.querySelector('.chat-messages')
    || document.querySelector('.messages');
  
  if (!input?.value.trim()) return;
  
  const userMsg = input.value.trim();
  input.value = '';

  if (messages) {
    appendMessage(messages, userMsg, 'message user-message');
    appendMessage(messages, 'Zen is thinking... 💭', 'message zen-message', 'typing');
  }

  try {
    const reply = await callGemini(userMsg);
    const typing = document.querySelector('#typing');
    if (typing) typing.remove();
    if (messages) {
      appendMessage(messages, reply, 'message zen-message');
    }
  } catch (err) {
    console.error('Gemini error:', err);
    const typing = document.querySelector('#typing');
    if (typing) {
      typing.removeAttribute('id');
      const p = typing.querySelector('p');
      if (p) p.textContent = 'Sorry, something went wrong. Try again!';
    }
  }
}

window.sendQuickMessage = function(msg) {
  const input = document.querySelector('#ai-input');
  if (input) { input.value = msg; window.sendAiMessage(); }
}
