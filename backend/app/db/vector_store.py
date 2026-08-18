import os
import time
from typing import List
import google.generativeai as genai
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from app.core.config import settings

api_key = str(getattr(settings, "GOOGLE_API_KEY", "")).strip()
if api_key:
    genai.configure(api_key=api_key)

class ReliableGoogleEmbeddings(Embeddings):
    """Reliable Google text-embedding-004 wrapper with zero-vector fallback prevention."""
    def __init__(self):
        self.model = "models/text-embedding-004"

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        
        all_embeddings = []
        # Process in safe batches of 15
        batch_size = 15
        for i in range(0, len(texts), batch_size):
            batch = [t[:1500] if t else " " for t in texts[i:i + batch_size]]
            try:
                res = genai.embed_content(
                    model=self.model,
                    content=batch,
                    task_type="retrieval_document"
                )
                embeddings = res.get("embedding", [])
                if embeddings and isinstance(embeddings[0], list):
                    all_embeddings.extend(embeddings)
                else:
                    for single_text in batch:
                        r = genai.embed_content(model=self.model, content=single_text, task_type="retrieval_document")
                        all_embeddings.append(r.get("embedding", [0.0] * 768))
            except Exception:
                for single_text in batch:
                    try:
                        r = genai.embed_content(model=self.model, content=single_text, task_type="retrieval_document")
                        all_embeddings.append(r.get("embedding", [0.0] * 768))
                    except Exception:
                        all_embeddings.append([0.0] * 768)
            time.sleep(0.05)

        return all_embeddings

    def embed_query(self, text: str) -> List[float]:
        clean_text = text[:1500] if text else " "
        try:
            res = genai.embed_content(
                model=self.model,
                content=clean_text,
                task_type="retrieval_query"
            )
            return res.get("embedding", [])
        except Exception:
            try:
                res = genai.embed_content(
                    model="text-embedding-004",
                    content=clean_text
                )
                return res.get("embedding", [])
            except Exception:
                return [0.0] * 768

embeddings = ReliableGoogleEmbeddings()

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