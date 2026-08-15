from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from app.core.config import settings

# Fast, local, and reliable embeddings
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)

def get_vector_store(bot_id: str) -> Chroma:
    """Returns the ChromaDB collection instance for a specific bot."""
    return Chroma(
        persist_directory=settings.CHROMA_PATH,
        embedding_function=embeddings,
        collection_name=f"bot_{bot_id}"
    )

def add_documents_to_vector_store(documents: list, bot_id: str):
    """Embeds and appends document chunks into the bot's Chroma collection."""
    vector_store = get_vector_store(bot_id)
    vector_store.add_documents(documents=documents)