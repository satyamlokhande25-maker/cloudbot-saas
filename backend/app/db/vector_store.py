import os
from langchain_chroma import Chroma
from langchain_core.embeddings import FakeEmbeddings
from app.core.config import settings

# Render Free Tier (512MB RAM) ke liye ultra-lightweight embeddings
embeddings = FakeEmbeddings(size=384)

def get_vector_store(bot_id: str) -> Chroma:
    """Returns the ChromaDB collection instance for a specific bot in an isolated directory."""
    bot_persist_dir = os.path.join(settings.CHROMA_PATH, bot_id)
    os.makedirs(bot_persist_dir, exist_ok=True)
    return Chroma(
        persist_directory=bot_persist_dir,
        embedding_function=embeddings,
        collection_name=f"bot_{bot_id}"
    )

def add_documents_to_vector_store(documents: list, bot_id: str):
    """Adds and appends new document chunks to the existing vector store collection."""
    vector_store = get_vector_store(bot_id)
    vector_store.add_documents(documents=documents)