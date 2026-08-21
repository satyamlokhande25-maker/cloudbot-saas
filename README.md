# ⚡ CloudBot SaaS (FastBot AI)

An AI-powered, multi-tenant conversational SaaS platform designed to build, customize, and deploy custom Knowledge-Base (RAG) AI Agents across multiple communication channels including WhatsApp, Discord, Telegram, and Embeddable Web Widgets.

---

## 🌟 Key Features

* **Multi-Tenant Architecture**: Dedicated data isolation per user/organization with secure authentication and database access control.
* **Retrieval-Augmented Generation (RAG)**: Ingest documents, FAQs, and custom text to deliver precise, context-aware answers powered by Google Gemini and vector search.
* **Multi-Channel Integrations**:
  * **WhatsApp Cloud API**: Webhook-based messaging and automated query responses.
  * **Discord Bot**: Server channel mentions and direct message interactions using `discord.py`.
  * **Telegram Bot**: Instant connection via BotFather API tokens.
  * **Embeddable Web Widget**: Lightweight drop-in `<script>` snippet for websites.
* **Real-Time Session Logging**: Automated tracking of user chats, response metrics, and token usage.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.10+, FastAPI, Uvicorn
* **Database & Auth**: Supabase (PostgreSQL), Row Level Security (RLS)
* **AI & Embeddings**: Google Gemini API (`gemini-1.5-flash`), ChromaDB / Vector Store
* **Integrations**: Meta WhatsApp Cloud API, Discord API (`discord.py`), Telegram Bot API
* **Deployment**: Render (Backend), Vercel (Frontend/Dashboard)

---

## 📁 Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI route handlers & webhooks
│   │   ├── core/            # Config, security, and environment loaders
│   │   ├── models/          # Pydantic schemas & database models
│   │   ├── services/        # RAG pipeline, Gemini LLM, and integration services
│   │   │   ├── discord_bot.py
│   │   │   ├── whatsapp_service.py
│   │   │   └── rag_service.py
│   │   └── main.py          # FastAPI application entrypoint
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile
├── frontend/                # SaaS dashboard & widgets
└── README.md
🚀 Getting Started
1. Prerequisites
Python 3.10 or higher

Node.js & npm (if running frontend dashboard)

Supabase Account & Project

Google Gemini API Key

2. Clone the Repository
Bash
git clone [https://github.com/your-username/cloudbot-saas.git](https://github.com/your-username/cloudbot-saas.git)
cd cloudbot-saas
3. Backend Setup
Bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
4. Environment Variables
Create a .env file inside the backend directory:

Code snippet
# Server
PORT=8000
ENVIRONMENT=development

# Database & Auth (Supabase)
SUPABASE_URL=[https://your-supabase-project.supabase.co](https://your-supabase-project.supabase.co)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM & AI
GEMINI_API_KEY=your_google_gemini_api_key

# WhatsApp Cloud API
WHATSAPP_TOKEN=your_meta_system_or_test_token
WHATSAPP_VERIFY_TOKEN=your_custom_webhook_secret_token
PHONE_NUMBER_ID=your_whatsapp_phone_number_id

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
5. Run the Server
Bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
🔌 Channel Setup Guides
💬 WhatsApp Cloud API
Navigate to the Meta Developers Portal and locate your WhatsApp App settings.

Set your Callback URL to:

Plaintext
[https://your-domain.com/chat/whatsapp/webhook/](https://your-domain.com/chat/whatsapp/webhook/)
Enter your configured WHATSAPP_VERIFY_TOKEN.

Subscribe to the messages webhook field.

🤖 Discord Bot
Create an application in the Discord Developer Portal.

Under the Bot tab, enable all Privileged Gateway Intents (Message Content Intent, Presence Intent, Server Members Intent).

Generate an OAuth2 invite link with the bot scope and message permissions (Send Messages, Read Messages/History).

Add the generated DISCORD_BOT_TOKEN to your environment variables.

🔒 Security & Database Policies
Database tables (users, bots, documents, chat_sessions) are governed by Supabase Row Level Security (RLS).

Multi-tenant queries are scoped by user_id / bot_id to ensure absolute tenant data isolation.

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.# ⚡ CloudBot SaaS (FastBot AI)

An AI-powered, multi-tenant conversational SaaS platform designed to build, customize, and deploy custom Knowledge-Base (RAG) AI Agents across multiple communication channels including WhatsApp, Discord, Telegram, and Embeddable Web Widgets.

---

## 🌟 Key Features

* **Multi-Tenant Architecture**: Dedicated data isolation per user/organization with secure authentication and database access control.
* **Retrieval-Augmented Generation (RAG)**: Ingest documents, FAQs, and custom text to deliver precise, context-aware answers powered by Google Gemini and vector search.
* **Multi-Channel Integrations**:
  * **WhatsApp Cloud API**: Webhook-based messaging and automated query responses.
  * **Discord Bot**: Server channel mentions and direct message interactions using `discord.py`.
  * **Telegram Bot**: Instant connection via BotFather API tokens.
  * **Embeddable Web Widget**: Lightweight drop-in `<script>` snippet for websites.
* **Real-Time Session Logging**: Automated tracking of user chats, response metrics, and token usage.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.10+, FastAPI, Uvicorn
* **Database & Auth**: Supabase (PostgreSQL), Row Level Security (RLS)
* **AI & Embeddings**: Google Gemini API (`gemini-1.5-flash`), ChromaDB / Vector Store
* **Integrations**: Meta WhatsApp Cloud API, Discord API (`discord.py`), Telegram Bot API
* **Deployment**: Render (Backend), Vercel (Frontend/Dashboard)

---

## 📁 Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI route handlers & webhooks
│   │   ├── core/            # Config, security, and environment loaders
│   │   ├── models/          # Pydantic schemas & database models
│   │   ├── services/        # RAG pipeline, Gemini LLM, and integration services
│   │   │   ├── discord_bot.py
│   │   │   ├── whatsapp_service.py
│   │   │   └── rag_service.py
│   │   └── main.py          # FastAPI application entrypoint
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile
├── frontend/                # SaaS dashboard & widgets
└── README.md
🚀 Getting Started
1. Prerequisites
Python 3.10 or higher

Node.js & npm (if running frontend dashboard)

Supabase Account & Project

Google Gemini API Key

2. Clone the Repository
Bash
git clone [https://github.com/your-username/cloudbot-saas.git](https://github.com/your-username/cloudbot-saas.git)
cd cloudbot-saas
3. Backend Setup
Bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
4. Environment Variables
Create a .env file inside the backend directory:

Code snippet
# Server
PORT=8000
ENVIRONMENT=development

# Database & Auth (Supabase)
SUPABASE_URL=[https://your-supabase-project.supabase.co](https://your-supabase-project.supabase.co)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM & AI
GEMINI_API_KEY=your_google_gemini_api_key

# WhatsApp Cloud API
WHATSAPP_TOKEN=your_meta_system_or_test_token
WHATSAPP_VERIFY_TOKEN=your_custom_webhook_secret_token
PHONE_NUMBER_ID=your_whatsapp_phone_number_id

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
5. Run the Server
Bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
🔌 Channel Setup Guides
💬 WhatsApp Cloud API
Navigate to the Meta Developers Portal and locate your WhatsApp App settings.

Set your Callback URL to:

Plaintext
[https://your-domain.com/chat/whatsapp/webhook/](https://your-domain.com/chat/whatsapp/webhook/)
Enter your configured WHATSAPP_VERIFY_TOKEN.

Subscribe to the messages webhook field.

🤖 Discord Bot
Create an application in the Discord Developer Portal.

Under the Bot tab, enable all Privileged Gateway Intents (Message Content Intent, Presence Intent, Server Members Intent).

Generate an OAuth2 invite link with the bot scope and message permissions (Send Messages, Read Messages/History).

Add the generated DISCORD_BOT_TOKEN to your environment variables.

🔒 Security & Database Policies
Database tables (users, bots, documents, chat_sessions) are governed by Supabase Row Level Security (RLS).

Multi-tenant queries are scoped by user_id / bot_id to ensure absolute tenant data isolation.

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.# ⚡ CloudBot SaaS (FastBot AI)

An AI-powered, multi-tenant conversational SaaS platform designed to build, customize, and deploy custom Knowledge-Base (RAG) AI Agents across multiple communication channels including WhatsApp, Discord, Telegram, and Embeddable Web Widgets.

---

## 🌟 Key Features

* **Multi-Tenant Architecture**: Dedicated data isolation per user/organization with secure authentication and database access control.
* **Retrieval-Augmented Generation (RAG)**: Ingest documents, FAQs, and custom text to deliver precise, context-aware answers powered by Google Gemini and vector search.
* **Multi-Channel Integrations**:
  * **WhatsApp Cloud API**: Webhook-based messaging and automated query responses.
  * **Discord Bot**: Server channel mentions and direct message interactions using `discord.py`.
  * **Telegram Bot**: Instant connection via BotFather API tokens.
  * **Embeddable Web Widget**: Lightweight drop-in `<script>` snippet for websites.
* **Real-Time Session Logging**: Automated tracking of user chats, response metrics, and token usage.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.10+, FastAPI, Uvicorn
* **Database & Auth**: Supabase (PostgreSQL), Row Level Security (RLS)
* **AI & Embeddings**: Google Gemini API (`gemini-1.5-flash`), ChromaDB / Vector Store
* **Integrations**: Meta WhatsApp Cloud API, Discord API (`discord.py`), Telegram Bot API
* **Deployment**: Render (Backend), Vercel (Frontend/Dashboard)

---

## 📁 Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI route handlers & webhooks
│   │   ├── core/            # Config, security, and environment loaders
│   │   ├── models/          # Pydantic schemas & database models
│   │   ├── services/        # RAG pipeline, Gemini LLM, and integration services
│   │   │   ├── discord_bot.py
│   │   │   ├── whatsapp_service.py
│   │   │   └── rag_service.py
│   │   └── main.py          # FastAPI application entrypoint
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile
├── frontend/                # SaaS dashboard & widgets
└── README.md
🚀 Getting Started
1. Prerequisites
Python 3.10 or higher

Node.js & npm (if running frontend dashboard)

Supabase Account & Project

Google Gemini API Key

2. Clone the Repository
Bash
git clone [https://github.com/your-username/cloudbot-saas.git](https://github.com/your-username/cloudbot-saas.git)
cd cloudbot-saas
3. Backend Setup
Bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
4. Environment Variables
Create a .env file inside the backend directory:

Code snippet
# Server
PORT=8000
ENVIRONMENT=development

# Database & Auth (Supabase)
SUPABASE_URL=[https://your-supabase-project.supabase.co](https://your-supabase-project.supabase.co)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM & AI
GEMINI_API_KEY=your_google_gemini_api_key

# WhatsApp Cloud API
WHATSAPP_TOKEN=your_meta_system_or_test_token
WHATSAPP_VERIFY_TOKEN=your_custom_webhook_secret_token
PHONE_NUMBER_ID=your_whatsapp_phone_number_id

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
5. Run the Server
Bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
🔌 Channel Setup Guides
💬 WhatsApp Cloud API
Navigate to the Meta Developers Portal and locate your WhatsApp App settings.

Set your Callback URL to:

Plaintext
[https://your-domain.com/chat/whatsapp/webhook/](https://your-domain.com/chat/whatsapp/webhook/)
Enter your configured WHATSAPP_VERIFY_TOKEN.

Subscribe to the messages webhook field.

🤖 Discord Bot
Create an application in the Discord Developer Portal.

Under the Bot tab, enable all Privileged Gateway Intents (Message Content Intent, Presence Intent, Server Members Intent).

Generate an OAuth2 invite link with the bot scope and message permissions (Send Messages, Read Messages/History).

Add the generated DISCORD_BOT_TOKEN to your environment variables.

🔒 Security & Database Policies
Database tables (users, bots, documents, chat_sessions) are governed by Supabase Row Level Security (RLS).

Multi-tenant queries are scoped by user_id / bot_id to ensure absolute tenant data isolation.

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
