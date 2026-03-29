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

window.sendAiMessage = async function() {
  const input = document.querySelector('#ai-input');
  const messages = document.querySelector('#ai-messages') 
    || document.querySelector('.chat-messages')
    || document.querySelector('.messages');
  
  if (!input?.value.trim()) return;
  
  const userMsg = input.value.trim();
  input.value = '';

  // Add user message to chat
  if (messages) {
    messages.innerHTML += `<div class="message user-message"><p>${userMsg}</p></div>`;
    messages.innerHTML += `<div id="typing" class="message zen-message"><p>Zen is thinking... 💭</p></div>`;
    messages.scrollTop = messages.scrollHeight;
  }

  try {
    const reply = await callGemini(userMsg);
    const typing = document.querySelector('#typing');
    if (typing) typing.remove();
    if (messages) {
      messages.innerHTML += `<div class="message zen-message"><p>${reply}</p></div>`;
      messages.scrollTop = messages.scrollHeight;
    }
  } catch (err) {
    console.error('Gemini error:', err);
    const typing = document.querySelector('#typing');
    if (typing) typing.outerHTML = `<div class="message zen-message"><p>Sorry, something went wrong. Try again!</p></div>`;
  }
}

window.sendQuickMessage = function(msg) {
  const input = document.querySelector('#ai-input');
  if (input) { input.value = msg; window.sendAiMessage(); }
}
