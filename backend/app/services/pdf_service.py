import os
import shutil
import tempfile
from fastapi import UploadFile, HTTPException
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.db.vector_store import add_documents_to_vector_store

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

def process_pdf_file(bot_id: str, file: UploadFile) -> int:
    """Safely saves, validates, extracts text from PDF, and stores chunks into ChromaDB."""
    # 1. Check file extension
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type: '{file.filename}'. Please upload a valid .pdf file."
        )

    temp_file_path = None
    try:
        # 2. Write uploaded bytes safely to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_file_path = tmp.name

        # 3. Check if file is empty
        if os.path.getsize(temp_file_path) == 0:
            raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")

        # 4. Check PDF magic header bytes (%PDF)
        with open(temp_file_path, "rb") as f:
            header = f.read(5)
            if not header.startswith(b"%PDF"):
                raise HTTPException(
                    status_code=400, 
                    detail="Invalid PDF format: File header is corrupted or this is not a genuine PDF document."
                )

        # 5. Load and split PDF
        loader = PyPDFLoader(temp_file_path)
        docs = loader.load()

        if not docs:
            raise HTTPException(status_code=400, detail="Could not extract any readable text from this PDF.")

        chunks = text_splitter.split_documents(docs)
        add_documents_to_vector_store(chunks, bot_id)

        return len(chunks)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PDF: {str(e)}"
        )
    finally:
        # Cleanup temp file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass