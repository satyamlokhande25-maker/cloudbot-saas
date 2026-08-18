import os
import time
from typing import List
import google.generativeai as genai
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from app.core.config import settings

# Configure Google GenAI
api_key = str(settings.GOOGLE_API_KEY).strip()
genai.configure(api_key=api_key)


class OfficialGoogleEmbeddings(Embeddings):
    """Reliable Google text-embedding-004 batch embedding wrapper."""

    def __init__(self):
        self.model = "models/text-embedding-004"

    def _embed_single(self, text: str, task_type: str) -> List[float]:
        clean = text[:2000] if text else " "
        try:
            res = genai.embed_content(
                model=self.model,
                content=clean,
                task_type=task_type
            )
            return res.get("embedding", [])
        except Exception:
            try:
                res = genai.embed_content(
                    model="text-embedding-004",
                    content=clean,
                    task_type=task_type
                )
                return res.get("embedding", [])
            except Exception as e:
                print(f"[Embedding Error] Failed single embedding: {e}")
                return [0.0] * 768

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        batch_size = 20
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = [t[:2000] if t else " " for t in texts[i:i + batch_size]]
            try:
                res = genai.embed_content(
                    model=self.model,
                    content=batch,
                    task_type="retrieval_document"
                )
                emb = res.get("embedding", [])
                if emb and isinstance(emb[0], list):
                    all_embeddings.extend(emb)
                else:
                    raise ValueError("Unexpected batch response format")
            except Exception as batch_err:
                print(f"[Embedding Batch Warning] Falling back to itemized processing: {batch_err}")
                for single_text in batch:
                    all_embeddings.append(self._embed_single(single_text, "retrieval_document"))

            # Brief pause to respect API rate limits on high chunk counts
            if len(texts) > batch_size:
                time.sleep(0.1)

        return all_embeddings

    def embed_query(self, text: str) -> List[float]:
        return self._embed_single(text, "retrieval_query")


embeddings = OfficialGoogleEmbeddings()


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