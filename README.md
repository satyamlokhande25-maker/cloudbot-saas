# CloudBot SaaS

## Enterprise-Grade AI-Powered Conversational Intelligence Platform

A comprehensive, production-ready SaaS solution designed for organizations to build, customize, and deploy intelligent Knowledge-Base (RAG) AI Agents seamlessly across multiple communication channels including WhatsApp, Discord, Telegram, and custom web integrations.

---

## Overview

CloudBot SaaS provides organizations with a unified platform for deploying conversational AI agents that leverage proprietary knowledge bases and business logic. Built with enterprise-grade architecture principles, the platform ensures secure multi-tenant data isolation, scalable infrastructure, and seamless integration with existing communication channels and workflows.

### Target Use Cases

- **Customer Support Automation**: Deliver instant, contextually accurate responses to customer inquiries
- **Internal Knowledge Access**: Enable employees to retrieve organizational knowledge through natural language
- **Document Retrieval Systems**: Implement semantic search across large document repositories
- **Multi-Channel Support**: Maintain consistent bot behavior across WhatsApp, Discord, Telegram, and web

---

## Core Capabilities

- **Secure Multi-Tenant Architecture**: Implements complete data isolation at the application and database levels with role-based access control (RBAC) and enterprise-grade authentication mechanisms ensuring full regulatory compliance and tenant data security.

- **Advanced Retrieval-Augmented Generation (RAG)**: Enables organizations to ingest proprietary documents, knowledge bases, and FAQ repositories to deliver contextually accurate responses powered by Google Gemini API with vector-based semantic search capabilities.

- **Unified Multi-Channel Communication Platform**:
  - **WhatsApp Integration**: Enterprise-grade webhook-based messaging via Meta WhatsApp Cloud API with automated response handling and message queuing
  - **Discord Workspace Integration**: Native Discord bot implementation with channel and direct message support using discord.py framework
  - **Telegram Bot Support**: Rapid deployment via BotFather API with webhook configuration
  - **Web Integration Widget**: Lightweight, self-contained chat widget for website integration with minimal dependencies

- **Comprehensive Analytics & Monitoring**: Real-time tracking of conversation metrics, response latency analysis, and API token consumption reporting for cost optimization and performance monitoring.

---

## Technology Stack

| Layer | Implementation |
|-------|---|
| **Backend Framework** | Python 3.10+, FastAPI, Uvicorn |
| **Data Persistence & Identity** | Supabase (PostgreSQL), Row Level Security (RLS), JWT-based Authentication |
| **Artificial Intelligence** | Google Gemini API (gemini-1.5-flash), ChromaDB Vector Store |
| **External Integrations** | Meta WhatsApp Cloud API, Discord.py Framework, Telegram Bot API |
| **Infrastructure & Deployment** | Render (Backend Runtime), Vercel (Frontend Hosting) |

---

## 📁 Project Architecture

```
cloudbot-saas/
├── backend/
│   ├── app/
│   │   ├── api/                 # FastAPI route handlers & webhooks
│   │   ├── core/                # Configuration, security, and environment management
│   │   ├── models/              # Pydantic schemas & database models
│   │   ├── services/            # RAG pipeline, LLM integration, and channel services
│   │   │   ├── discord_bot.py
│   │   │   ├── whatsapp_service.py
│   │   │   └── rag_service.py
│   │   └── main.py              # FastAPI application entrypoint
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Container configuration
├── frontend/                    # SaaS dashboard & widget components
├── .env.example                 # Environment variables template
└── README.md                    # Project documentation
```

---

## Deployment & Configuration

### System Requirements

The following prerequisites must be satisfied prior to deployment:

- **Python Runtime**: Version 3.10 or higher
- **Frontend Dependencies**: Node.js 16+ and npm package manager (for dashboard)
- **Database**: Active Supabase project with PostgreSQL database
- **API Credentials**: Valid Google Gemini API key with appropriate quotas

### Installation Procedure

#### Step 1: Repository Setup

```bash
git clone https://github.com/your-username/cloudbot-saas.git
cd cloudbot-saas
```

#### Step 2: Backend Environment Configuration

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows users: venv\Scripts\activate
pip install -r requirements.txt
```

#### Step 3: Environment Variables Configuration

Create a `.env` configuration file in the `backend/` directory with the following parameters:

```env
# Application Configuration
PORT=8000
ENVIRONMENT=development

# Supabase Database & Authentication
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini LLM Configuration
GEMINI_API_KEY=your_google_gemini_api_key

# WhatsApp Cloud API Credentials
WHATSAPP_TOKEN=your_meta_system_or_test_token
WHATSAPP_VERIFY_TOKEN=your_custom_webhook_secret_token
PHONE_NUMBER_ID=your_whatsapp_phone_number_id

# Discord Bot Credentials
DISCORD_BOT_TOKEN=your_discord_bot_token
```

#### Step 4: Server Initialization

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API server will be accessible at `http://localhost:8000`

---

## Channel Integration Configuration

### WhatsApp Cloud API Setup

Follow these procedures to establish WhatsApp integration:

1. Access the **Meta Developers Console** and navigate to your WhatsApp application configuration
2. Configure the webhook callback endpoint:
   ```
   https://your-domain.com/chat/whatsapp/webhook/
   ```
3. Register the `WHATSAPP_VERIFY_TOKEN` for webhook validation and security
4. Subscribe to the `messages` webhook event type in the application manifest
5. Execute webhook verification process and deploy to production environment

### Discord Bot Configuration

Complete the following steps to integrate Discord:

1. Create a new application in the **Discord Developer Portal**
2. Navigate to the **Bot** configuration panel and enable the following Privileged Gateway Intents:
   - Message Content Intent
   - Presence Intent
   - Server Members Intent
3. Generate an OAuth2 authorization link with the following specifications:
   - OAuth Scope: `bot`
   - Required Permissions: `Send Messages`, `Read Messages/History`
4. Populate the `DISCORD_BOT_TOKEN` environment variable with the generated token
5. Authorize the bot application to your Discord workspace using the OAuth link

### Telegram Bot Deployment

To configure Telegram bot integration:

1. Initialize a new bot by contacting **@BotFather** on Telegram
2. Record the issued bot token and add it to the `TELEGRAM_BOT_TOKEN` environment variable
3. Configure webhook endpoint for message reception
4. Deploy bot to production and activate polling or webhook mode

---

## Security Architecture & Compliance

### Data Protection Framework

The platform implements comprehensive security controls at multiple layers:

- **Row Level Security (RLS)**: All database tables (`users`, `bots`, `documents`, `chat_sessions`) enforce Supabase RLS policies at the table level
- **Multi-Tenant Isolation**: Query scoping mechanisms based on `user_id` and `bot_id` attributes ensure complete logical isolation between tenants
- **Service Account Management**: Privileged operations utilize service role authentication with comprehensive audit logging and access tracking
- **Credential Management**: All sensitive credentials are managed exclusively through environment variables with no hardcoded values

### Security Best Practices & Operational Guidelines

Organizations deploying this platform should adhere to the following security protocols:

- **Credential Rotation**: Implement scheduled rotation of API tokens and authentication credentials (minimum quarterly)
- **Environment Isolation**: Maintain separate `.env` configurations for development, staging, and production environments
- **Transport Security**: Enforce HTTPS/TLS 1.2+ for all webhook endpoints and API communications
- **Rate Limiting**: Implement API rate limiting on public endpoints to prevent abuse and ensure platform stability
- **Audit Logging**: Enable comprehensive logging and monitoring of all API access patterns and administrative actions
- **Access Control**: Implement principle of least privilege for all service account permissions

---

## API Documentation & Developer Resources

Interactive API documentation is available once the development server is running:

- **OpenAPI/Swagger Interface**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

These resources provide comprehensive endpoint documentation, request/response schemas, and interactive testing capabilities.

---

## Production Deployment

### Backend Infrastructure (Render)

Deploy the backend service using Render's container platform:

1. Connect your Git repository to Render
2. Create a new Web Service
3. Configure build process: `pip install -r requirements.txt`
4. Set startup command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Populate all required environment variables in the Render dashboard
6. Initialize deployment and monitor runtime logs

### Frontend Distribution (Vercel)

Deploy the SaaS dashboard using Vercel's edge network:

1. Connect your Git repository to Vercel
2. Configure build settings for your frontend framework (React, Next.js, Vue, etc.)
3. Register API endpoint environment variables
4. Enable automatic deployments on repository push

---

## Licensing

This software is distributed under the MIT License. Refer to the [LICENSE](LICENSE) file for complete license terms and conditions.

---

## Support & Contributions

### Reporting Issues

For bug reports, feature requests, or technical issues:

- Create an issue in the GitHub repository with detailed reproduction steps
- Include relevant configuration and error logs
- Specify affected versions and deployment environment

### Contributing

We welcome contributions from the community. Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit changes with descriptive messages
4. Submit a pull request with comprehensive documentation

---

**Documentation Version**: 2.0  
**Last Updated**: August 2026  
**Status**: Production Ready
