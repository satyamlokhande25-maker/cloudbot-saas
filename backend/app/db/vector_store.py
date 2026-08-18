import os
import requests
from typing import List
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from app.core.config import settings

class DirectGoogleRESTEmbeddings(Embeddings):
    """Direct REST API Embeddings for text-embedding-004 (Zero SDK Dependencies)."""

    def __init__(self):
        self.api_key = str(getattr(settings, "GOOGLE_API_KEY", "")).strip()
        self.url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={self.api_key}"

    def _get_embedding(self, text: str) -> List[float]:
        clean_text = str(text)[:2000].strip() if text else " "
        if not self.api_key:
            return [0.0] * 768

        payload = {
            "model": "models/text-embedding-004",
            "content": {
                "parts": [{"text": clean_text}]
            }
        }
        headers = {"Content-Type": "application/json"}

        try:
            resp = requests.post(self.url, headers=headers, json=payload, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                values = data.get("embedding", {}).get("values", [])
                if values and len(values) > 0:
                    return values
        except Exception:
            pass

        return [0.0] * 768

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        embeddings_list = []
        for t in texts:
            emb = self._get_embedding(t)
            embeddings_list.append(emb)
        return embeddings_list

    def embed_query(self, text: str) -> List[float]:
        return self._get_embedding(text)

embeddings = DirectGoogleRESTEmbeddings()

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
    """Embeds and saves document chunks into the Chroma collection."""
    vector_store = get_vector_store(bot_id)
    vector_store.add_documents(documents=documents)