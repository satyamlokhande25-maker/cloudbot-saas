import io
import pypdf
from fastapi import HTTPException, UploadFile
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.db.vector_store import add_documents_to_vector_store

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

async def process_pdf_file(bot_id: str, file: UploadFile) -> int:
    """Extracts text from PDF file and stores chunk embeddings into ChromaDB."""
    try:
        content = await file.read()
        reader = pypdf.PdfReader(io.BytesIO(content))
        text_parts = []
        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

        full_text = "\n\n".join(text_parts).strip()
        if not full_text:
            raise HTTPException(status_code=400, detail="The uploaded PDF does not contain readable text.")

        doc = Document(
            page_content=full_text,
            metadata={"source": file.filename or "uploaded.pdf", "bot_id": bot_id}
        )
        chunks = text_splitter.split_documents([doc])
        add_documents_to_vector_store(chunks, bot_id)

        return len(chunks)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")