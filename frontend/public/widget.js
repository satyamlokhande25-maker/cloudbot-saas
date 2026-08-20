(function () {
  const BACKEND_API_URL = "https://cloudbot-saas.onrender.com";
  const currentScript = document.currentScript || document.querySelector('script[data-bot-id]');
  const botId = (currentScript && currentScript.getAttribute('data-bot-id')) || 'test_bot_1';

  // Inject Styles
  const style = document.createElement('style');
  style.innerHTML = `
    #cloudbot-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #cloudbot-toggle-btn {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #4f46e5;
      color: white;
      border: none;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background 0.2s;
    }
    #cloudbot-toggle-btn:hover { transform: scale(1.05); background: #4338ca; }
    #cloudbot-chat-window {
      display: none;
      flex-direction: column;
      width: 360px;
      height: 520px;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      margin-bottom: 12px;
    }
    #cloudbot-header {
      background: #1e293b;
      color: white;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 600;
      font-size: 14px;
      border-bottom: 1px solid #334155;
    }
    #cloudbot-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 18px;
      cursor: pointer;
    }
    
    /* Lead Form Styling */
    #cloudbot-lead-screen {
      flex: 1;
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 12px;
      background: #0f172a;
    }
    .cb-lead-title {
      font-size: 16px;
      font-weight: 600;
      color: #f8fafc;
      text-align: center;
      margin: 0;
    }
    .cb-lead-subtitle {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      margin-bottom: 8px;
    }
    .cb-lead-input {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      color: white;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13px;
      box-sizing: border-box;
      outline: none;
    }
    .cb-lead-input:focus { border-color: #6366f1; }
    .cb-lead-submit {
      width: 100%;
      background: #4f46e5;
      color: white;
      border: none;
      padding: 11px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      margin-top: 4px;
      transition: background 0.2s;
    }
    .cb-lead-submit:hover { background: #4338ca; }
    .cb-lead-skip {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 12px;
      cursor: pointer;
      text-align: center;
      text-decoration: underline;
    }

    /* Chat View Styling */
    #cloudbot-chat-screen {
      display: none;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }
    #cloudbot-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .cb-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.4;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    .cb-user {
      background: #4f46e5;
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
    }
    .cb-bot {
      background: #1e293b;
      color: #e2e8f0;
      align-self: flex-start;
      border-bottom-left-radius: 2px;
      border: 1px solid #334155;
    }
    #cloudbot-input-container {
      display: flex;
      padding: 12px;
      background: #1e293b;
      border-top: 1px solid #334155;
      gap: 8px;
    }
    #cloudbot-input {
      flex: 1;
      background: #0f172a;
      border: 1px solid #334155;
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    #cloudbot-input:focus { border-color: #6366f1; }
    #cloudbot-send-btn {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    }
    #cloudbot-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;
  document.head.appendChild(style);

  // Widget Markup
  const container = document.createElement('div');
  container.id = 'cloudbot-widget-container';
  container.innerHTML = `
    <div id="cloudbot-chat-window">
      <div id="cloudbot-header">
        <span>CloudBot Support</span>
        <button id="cloudbot-close-btn">&times;</button>
      </div>

      <div id="cloudbot-lead-screen">
        <h3 class="cb-lead-title">Welcome to Support! 👋</h3>
        <p class="cb-lead-subtitle">Please share your contact details to start chatting.</p>
        <input type="text" id="cb-lead-name" class="cb-lead-input" placeholder="Your Full Name *" required />
        <input type="email" id="cb-lead-email" class="cb-lead-input" placeholder="Your Email Address *" required />
        <input type="tel" id="cb-lead-phone" class="cb-lead-input" placeholder="Phone Number (optional)" />
        <button id="cb-lead-btn" class="cb-lead-submit">Start Conversation</button>
        <button id="cb-lead-skip" class="cb-lead-skip">Skip for now</button>
      </div>

      <div id="cloudbot-chat-screen">
        <div id="cloudbot-messages">
          <div class="cb-msg cb-bot">Hello! How can I assist you today?</div>
        </div>
        <div id="cloudbot-input-container">
          <input type="text" id="cloudbot-input" placeholder="Ask a question..." />
          <button id="cloudbot-send-btn">Send</button>
        </div>
      </div>
    </div>

    <button id="cloudbot-toggle-btn" aria-label="Open Chat">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>
  `;
  document.body.appendChild(container);

  // DOM Elements
  const toggleBtn = document.getElementById('cloudbot-toggle-btn');
  const closeBtn = document.getElementById('cloudbot-close-btn');
  const chatWindow = document.getElementById('cloudbot-chat-window');
  const leadScreen = document.getElementById('cloudbot-lead-screen');
  const chatScreen = document.getElementById('cloudbot-chat-screen');
  const leadName = document.getElementById('cb-lead-name');
  const leadEmail = document.getElementById('cb-lead-email');
  const leadPhone = document.getElementById('cb-lead-phone');
  const leadBtn = document.getElementById('cb-lead-btn');
  const leadSkip = document.getElementById('cb-lead-skip');
  const messagesContainer = document.getElementById('cloudbot-messages');
  const input = document.getElementById('cloudbot-input');
  const sendBtn = document.getElementById('cloudbot-send-btn');

  // Check if lead was already captured in this browser session
  const isLeadCaptured = sessionStorage.getItem(`cb_lead_${botId}`);
  if (isLeadCaptured) {
    leadScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
  }

  toggleBtn.onclick = () => {
    const isVisible = chatWindow.style.display === 'flex';
    chatWindow.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      if (chatScreen.style.display === 'flex') {
        input.focus();
      } else {
        leadName.focus();
      }
    }
  };

  closeBtn.onclick = () => { chatWindow.style.display = 'none'; };

  function unlockChat() {
    leadScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
    sessionStorage.setItem(`cb_lead_${botId}`, 'true');
    input.focus();
  }

  // Submit Lead Form
  leadBtn.onclick = async () => {
    const name = leadName.value.trim();
    const email = leadEmail.value.trim();
    const phone = leadPhone.value.trim();

    if (!name || !email) {
      alert("Please provide both Name and Email address.");
      return;
    }

    leadBtn.disabled = true;
    leadBtn.textContent = "Connecting...";

    try {
      await fetch(`${BACKEND_API_URL}/chat/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: botId,
          name: name,
          email: email,
          phone: phone || null
        })
      });
    } catch (e) {
      console.warn("Lead capture background error:", e);
    }

    unlockChat();
  };

  leadSkip.onclick = () => {
    unlockChat();
  };

  async function sendMessage() {
    const question = input.value.trim();
    if (!question) return;

    // Append User Message
    const userDiv = document.createElement('div');
    userDiv.className = 'cb-msg cb-user';
    userDiv.textContent = question;
    messagesContainer.appendChild(userDiv);
    input.value = '';
    sendBtn.disabled = true;

    // Loading State
    const botLoading = document.createElement('div');
    botLoading.className = 'cb-msg cb-bot';
    botLoading.textContent = 'Thinking...';
    messagesContainer.appendChild(botLoading);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const response = await fetch(`${BACKEND_API_URL}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: botId, question: question })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        botLoading.textContent = (data && data.detail) || `Server status: ${response.status}`;
      } else {
        botLoading.textContent = (data && data.answer) || "I do not have enough information from the provided content.";
      }
    } catch (err) {
      botLoading.textContent = "Server is waking up (Render Free Tier). Please ask again in 5 seconds.";
    } finally {
      sendBtn.disabled = false;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  sendBtn.onclick = sendMessage;
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
})();