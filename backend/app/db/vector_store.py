import os
import requests
from typing import List
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from app.core.config import settings

class FastGoogleEmbeddings(Embeddings):
    """Ultra-fast batch Google GenAI embeddings with strict timeout prevention."""
    def __init__(self, api_key: str):
        self.api_key = str(api_key).strip()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key or not texts:
            return [[0.0] * 768 for _ in texts]

        # 🔹 Send in batches of 40 chunks per request
        batch_size = 40
        all_embeddings = []
        headers = {"Content-Type": "application/json"}
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key={self.api_key}"

        for i in range(0, len(texts), batch_size):
            chunk_batch = texts[i:i + batch_size]
            payload = {
                "requests": [
                    {
                        "model": "models/text-embedding-004",
                        "content": {"parts": [{"text": t[:1000] if t else " "}]}
                    }
                    for t in chunk_batch
                ]
            }
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=10)
                if resp.status_code == 200:
                    data = resp.json().get("embeddings", [])
                    for item in data:
                        all_embeddings.append(item.get("values", [0.0] * 768))
                else:
                    all_embeddings.extend([[0.0] * 768 for _ in chunk_batch])
            except Exception:
                all_embeddings.extend([[0.0] * 768 for _ in chunk_batch])

        return all_embeddings

    def embed_query(self, text: str) -> List[float]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={self.api_key}"
        try:
            resp = requests.post(
                url,
                headers={"Content-Type": "application/json"},
                json={"content": {"parts": [{"text": text[:1000] if text else " "}]}},
                timeout=6
            )
            if resp.status_code == 200:
                return resp.json().get("embedding", {}).get("values", [0.0] * 768)
        except Exception:
            pass
        return [0.0] * 768

embeddings = FastGoogleEmbeddings(api_key=settings.GOOGLE_API_KEY)

def get_vector_store(bot_id: str) -> Chroma:
    bot_persist_dir = os.path.join(settings.CHROMA_PATH, bot_id)
    os.makedirs(bot_persist_dir, exist_ok=True)
    return Chroma(
        persist_directory=bot_persist_dir,
        embedding_function=embeddings,
        collection_name=f"bot_{bot_id}"
    )

def add_documents_to_vector_store(documents: list, bot_id: str):
    vector_store = get_vector_store(bot_id)
    vector_store.add_documents(documents=documents)