import os
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import settings

# 🔹 Google Gemini Production Embeddings (High Semantic Accuracy & Zero RAM overhead on Render)
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=settings.GOOGLE_API_KEY
)

def get_vector_store(bot_id: str) -> Chroma:
    """Returns an isolated ChromaDB vector store instance for a specific bot."""
    bot_persist_dir = os.path.join(settings.CHROMA_PATH, bot_id)
    os.makedirs(bot_persist_dir, exist_ok=True)
    return Chroma(
        persist_directory=bot_persist_dir,
        embedding_function=embeddings,
        collection_name=f"bot_{bot_id}"
    )

def add_documents_to_vector_store(documents: list, bot_id: str):
    """Embeds and appends new document chunks into the bot's Chroma collection."""
    vector_store = get_vector_store(bot_id)
    vector_store.add_documents(documents=documents)