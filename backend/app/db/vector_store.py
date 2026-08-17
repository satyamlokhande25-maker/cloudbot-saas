import os
import requests
from typing import List
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from app.core.config import settings

class RobustGoogleEmbeddings(Embeddings):
    """Direct REST-based Google GenAI embeddings with multi-model fallback."""
    def __init__(self, api_key: str):
        self.api_key = str(api_key).strip()

    def _embed_text(self, text: str) -> List[float]:
        if not self.api_key:
            return [0.0] * 768

        # 🔹 Models & API Versions auto-trial
        models = ["text-embedding-004", "embedding-001"]
        versions = ["v1beta", "v1"]
        headers = {"Content-Type": "application/json"}

        # Truncate content safely to avoid token limit errors
        clean_text = text[:3000] if text else " "

        for model in models:
            for ver in versions:
                url = f"https://generativelanguage.googleapis.com/{ver}/models/{model}:embedContent?key={self.api_key}"
                payload = {
                    "content": {
                        "parts": [{"text": clean_text}]
                    }
                }
                try:
                    resp = requests.post(url, headers=headers, json=payload, timeout=20)
                    if resp.status_code == 200:
                        values = resp.json().get("embedding", {}).get("values", [])
                        if values:
                            return values
                except Exception:
                    continue

        return [0.0] * 768

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed_text(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._embed_text(text)

# 🔹 100% crash-proof embedding instance
embeddings = RobustGoogleEmbeddings(api_key=settings.GOOGLE_API_KEY)

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
    """Embeds and saves document chunks into the bot's Chroma collection."""
    vector_store = get_vector_store(bot_id)
    vector_store.add_documents(documents=documents)