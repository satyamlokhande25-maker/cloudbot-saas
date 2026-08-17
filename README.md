# CloudBot AI — Enterprise AI Chatbot SaaS Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://cloudbot-saas.vercel.app)
[![API Documentation](https://img.shields.io/badge/API_Docs-Swagger_UI-85EA2D?style=for-the-badge&logo=swagger)](https://cloudbot-saas.onrender.com/docs)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

CloudBot AI is a production-ready, multi-tenant SaaS platform for building and deploying custom AI chatbots powered by Retrieval-Augmented Generation (RAG). Users can train intelligent assistants from websites, YouTube videos, and PDF documents—each with complete isolation and security.

---


## 🎯 Key Capabilities

### Multi-Source Knowledge Ingestion
- **Web Scraping:** Extract and clean text from any website URL
- **Video Processing:** Automatic transcript extraction from YouTube content
- **Document Parsing:** Direct PDF upload with intelligent text extraction

### Advanced AI Features
- **Semantic RAG Pipeline:** ChromaDB vector search combined with generative models for accurate, grounded responses
- **Multi-Bot Workspace Isolation:** Create isolated chatbot instances with custom prompts and dedicated vector namespaces
- **Conversation Analytics:** Persistent audit logs tracking all user interactions and conversation history
- **Enterprise Authentication:** JWT-based secure user authentication and session management

### Integration & Deployment
- **Embeddable Chat Widget:** Single `<script>` snippet for seamless integration on WordPress, Shopify, Webflow, and static sites
- **REST API:** Fully documented API for custom integrations
- **Production Ready:** Deployed on Vercel and Render with automatic scaling

---

## 📊 Live Deployments

| Component | URL |
|-----------|-----|
| **Dashboard** | [https://cloudbot-saas.vercel.app](https://cloudbot-saas.vercel.app) |
| **API Documentation** | [https://cloudbot-saas.onrender.com/docs](https://cloudbot-saas.onrender.com/docs) |
| **Widget Script** | [https://cloudbot-saas.onrender.com/widget.js](https://cloudbot-saas.onrender.com/widget.js) |

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│          Next.js Frontend (Vercel Hosting)              │
│   React 18 | TypeScript | Tailwind CSS | App Router    │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (JSON/Multipart)
┌────────────────────────▼────────────────────────────────┐
│          FastAPI Backend (Render Hosting)               │
│    RAG Engine | Ingestion Pipelines | Multi-Tenant Auth │
└──────────────┬─────────────────────────┬────────────────┘
               │                         │
    ┌──────────▼──────────┐  ┌───────────▼──────────────┐
    │ ChromaDB Vector DB  │  │ Google Gemini AI Engine  │
    │ (Isolated Storage)  │  │ (Embeddings & LLM)       │
    └─────────────────────┘  └────────────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Axios (HTTP Client)
- Lucide Icons

**Backend:**
- FastAPI (ASGI Framework)
- Uvicorn (Web Server)
- Pydantic (Data Validation)
- SQLAlchemy (ORM)

**AI & Vector Search:**
- LangChain (RAG Framework)
- Google Generative AI (text-embedding-004, gemini-1.5-flash)
- ChromaDB (Vector Database)

**Data Processing:**
- BeautifulSoup4 (Web Scraping)
- PyPDF (PDF Processing)
- youtube-transcript-api (Video Transcripts)

**Infrastructure:**
- Vercel (Frontend Hosting)
- Render (Backend Hosting)

---

## 📁 Project Structure

```
cloudbot/
│
├── backend/
│   ├── app/
│   │   ├── api/              # REST API endpoints
│   │   │   ├── auth.py       # Authentication routes
│   │   │   ├── bots.py       # Bot management
│   │   │   ├── train.py      # Training endpoints
│   │   │   └── chat.py       # Chat inference
│   │   ├── core/             # Configuration & security
│   │   ├── db/               # Database & vector store
│   │   ├── schemas/          # Pydantic models
│   │   └── services/         # Business logic
│   │       ├── pdf_service.py
│   │       ├── scraper_service.py
│   │       ├── youtube_service.py
│   │       └── rag_service.py
│   ├── requirements.txt
│   └── main.py
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── dashboard/    # Main dashboard
    │   │   ├── auth/         # Authentication pages
    │   │   └── chat/         # Chat interface
    │   └── lib/              # Utilities & API client
    ├── public/               # Static assets
    ├── package.json
    └── tailwind.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ with npm
- Google AI Studio API Key ([Get one here](https://aistudio.google.com/))

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with required variables
cat > .env << EOF
GOOGLE_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_jwt_secret_key_here
CHROMA_PATH=./chroma_db
DATABASE_URL=sqlite:///./cloudbot.db
EOF

# Start the development server
uvicorn main:app --reload --port 8000
```

**API Documentation:** http://127.0.0.1:8000/docs

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 > .env.local

# Start development server
npm run dev
```

**Dashboard:** http://localhost:3000

---

## 🔌 Widget Integration

Embed the ChatBot on any website with a single line:

```html
<!-- Add before closing </body> tag -->
<script 
  src="https://cloudbot-saas.onrender.com/widget.js" 
  data-bot-id="YOUR_BOT_ID" 
  defer>
</script>
```

The widget will appear as a floating chat bubble in the bottom-right corner.

---

## 📚 API Endpoints Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/register` | User registration |
| `POST` | `/api/auth/login` | User login |
| `POST` | `/api/bots/create` | Create new chatbot |
| `POST` | `/api/train/pdf` | Train from PDF |
| `POST` | `/api/train/website` | Train from website URL |
| `POST` | `/api/train/youtube` | Train from YouTube video |
| `POST` | `/api/chat` | Send message to chatbot |
| `GET` | `/api/bots/{bot_id}/logs` | Retrieve conversation logs |

Complete API documentation available at `/docs` endpoint.

---

## 🔐 Security Features

- **JWT Authentication:** Secure token-based user authentication
- **Multi-Tenant Isolation:** Each user's data and bots are completely isolated
- **Vector Database Isolation:** Dedicated ChromaDB collections per bot
- **Environment Variables:** Sensitive data stored securely in .env files
- **CORS Protection:** Configurable cross-origin resource sharing

---

## 📈 Performance & Scalability

- **Vector Search:** Sub-second semantic search via ChromaDB
- **Caching:** Intelligent caching of embeddings and responses
- **Async Processing:** Non-blocking ingestion pipelines for large documents
- **Database Indexing:** Optimized queries with proper indexing
- **Horizontal Scaling:** Backend can scale to multiple instances

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check the [API Documentation](https://cloudbot-saas.onrender.com/docs)
- Review the project wiki for detailed guides

---

## 🎓 Learning Resources

- [RAG Systems Guide](https://python.langchain.com/docs/use_cases/question_answering/)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Google Gemini API](https://ai.google.dev/)
- [FastAPI Tutorial](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Made with ❤️ by CloudBot AI Team**
