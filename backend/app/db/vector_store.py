import os
from langchain_chroma import Chroma
from langchain_core.embeddings import FakeEmbeddings
from app.core.config import settings

# Render Free Tier (512MB RAM) ke liye ultra-lightweight embeddings
embeddings = FakeEmbeddings(size=384)

def get_vector_store(bot_id: str) -> Chroma:
    """Returns the ChromaDB collection instance for a specific bot."""
    os.makedirs(settings.CHROMA_PATH, exist_ok=True)
    return Chroma(
        persist_directory=settings.CHROMA_PATH,
        embedding_function=embeddings,
        collection_name=f"bot_{bot_id}"
    )

def add_documents_to_vector_store(documents: list, bot_id: str):
    """Saves document chunks into the bot's Chroma collection."""
    os.makedirs(settings.CHROMA_PATH, exist_ok=True)
    Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        persist_directory=settings.CHROMA_PATH,
        collection_name=f"bot_{bot_id}"
    )