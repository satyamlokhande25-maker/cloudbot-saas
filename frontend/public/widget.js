(function () {
  // 1. Get bot-id from script attributes
  const currentScript = document.currentScript || document.querySelector('script[data-bot-id]');
  const botId = currentScript ? currentScript.getAttribute('data-bot-id') : 'test_bot_1';
  const backendUrl = 'http://127.0.0.1:8000';

  // 2. Inject Styles
  const style = document.createElement('style');
  style.innerHTML = `
    .cb-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .cb-toggle-btn {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #4f46e5;
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, background 0.2s ease;
    }
    .cb-toggle-btn:hover {
      transform: scale(1.06);
      background: #4338ca;
    }
    .cb-chat-window {
      display: none;
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 360px;
      height: 500px;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      flex-direction: column;
      overflow: hidden;
    }
    .cb-chat-header {
      background: #1e293b;
      color: white;
      padding: 14px 16px;
      font-size: 14px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cb-close-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 18px;
      cursor: pointer;
    }
    .cb-messages {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .cb-msg {
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.4;
      word-wrap: break-word;
    }
    .cb-msg-bot {
      background: #1e293b;
      color: #e2e8f0;
      align-self: flex-start;
      border-bottom-left-radius: 2px;
    }
    .cb-msg-user {
      background: #4f46e5;
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
    }
    .cb-input-form {
      display: flex;
      padding: 10px;
      border-top: 1px solid #1e293b;
      background: #0f172a;
    }
    .cb-input {
      flex: 1;
      background: #1e293b;
      border: none;
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    .cb-send-btn {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 8px 14px;
      margin-left: 6px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);

  // 3. Create Widget DOM Elements
  const container = document.createElement('div');
  container.className = 'cb-widget-container';

  container.innerHTML = `
    <div class="cb-chat-window" id="cbChatWindow">
      <div class="cb-chat-header">
        <span>CloudBot Support</span>
        <button class="cb-close-btn" id="cbCloseBtn">✕</button>
      </div>
      <div class="cb-messages" id="cbMessages">
        <div class="cb-msg cb-msg-bot">Hello! How can I assist you today?</div>
      </div>
      <form class="cb-input-form" id="cbForm">
        <input type="text" class="cb-input" id="cbInput" placeholder="Ask a question..." autocomplete="off" />
        <button type="submit" class="cb-send-btn">Send</button>
      </form>
    </div>
    <button class="cb-toggle-btn" id="cbToggleBtn">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>
  `;
  document.body.appendChild(container);

  // 4. Widget Logic & Event Handlers
  const toggleBtn = document.getElementById('cbToggleBtn');
  const closeBtn = document.getElementById('cbCloseBtn');
  const chatWindow = document.getElementById('cbChatWindow');
  const form = document.getElementById('cbForm');
  const input = document.getElementById('cbInput');
  const messages = document.getElementById('cbMessages');

  function toggleChat() {
    const isShown = chatWindow.style.display === 'flex';
    chatWindow.style.display = isShown ? 'none' : 'flex';
  }

  toggleBtn.onclick = toggleChat;
  closeBtn.onclick = toggleChat;

  form.onsubmit = async function (e) {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    // Append User Message
    const userDiv = document.createElement('div');
    userDiv.className = 'cb-msg cb-msg-user';
    userDiv.textContent = query;
    messages.appendChild(userDiv);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    // Add Loading bubble
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'cb-msg cb-msg-bot';
    loadingDiv.textContent = 'Thinking...';
    messages.appendChild(loadingDiv);
    messages.scrollTop = messages.scrollHeight;

    try {
      const response = await fetch(`${backendUrl}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: botId, question: query })
      });
      const data = await response.json();
      loadingDiv.textContent = data.answer || "Sorry, I couldn't get an answer.";
    } catch (err) {
      loadingDiv.textContent = "Error: Could not connect to AI server.";
    }
    messages.scrollTop = messages.scrollHeight;
  };
})();