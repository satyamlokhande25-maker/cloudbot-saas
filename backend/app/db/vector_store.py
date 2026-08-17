import os
import google.generativeai as genai
from typing import List
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from app.core.config import settings

# Google GenAI API Configure
genai.configure(api_key=str(settings.GOOGLE_API_KEY).strip())

class OfficialGoogleEmbeddings(Embeddings):
    """Official Google Generative AI batch embeddings for exact semantic retrieval."""
    def __init__(self):
        self.model = "models/text-embedding-004"

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        
        batch_size = 40
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            chunk_batch = [t[:1800] if t else " " for t in texts[i:i + batch_size]]
            try:
                res = genai.embed_content(
                    model=self.model,
                    content=chunk_batch,
                    task_type="retrieval_document"
                )
                embeddings = res.get("embedding", [])
                all_embeddings.extend(embeddings)
            except Exception:
                # Fallback to embedding-001
                try:
                    res = genai.embed_content(
                        model="models/embedding-001",
                        content=chunk_batch,
                        task_type="retrieval_document"
                    )
                    all_embeddings.extend(res.get("embedding", []))
                except Exception:
                    all_embeddings.extend([[0.0] * 768 for _ in chunk_batch])
                    
        return all_embeddings

    def embed_query(self, text: str) -> List[float]:
        clean_text = text[:1800] if text else " "
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
                    model="models/embedding-001",
                    content=clean_text,
                    task_type="retrieval_query"
                )
                return res.get("embedding", [])
            except Exception:
                return [0.0] * 768

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