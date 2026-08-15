import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.db.vector_store import add_documents_to_vector_store

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

def scrape_and_index_website(bot_id: str, url: str) -> int:
    """Scrapes clean text from a web page and saves chunks into ChromaDB."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to fetch webpage. HTTP Status: {response.status_code}"
            )

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove scripts, styles, navigation, footer tags
        for element in soup(["script", "style", "nav", "footer", "header", "noscript"]):
            element.decompose()

        text = soup.get_text(separator=" ", strip=True)

        if not text.strip():
            raise HTTPException(status_code=400, detail="No readable text found on the webpage.")

        doc = Document(page_content=text, metadata={"source": url})
        chunks = text_splitter.split_documents([doc])
        add_documents_to_vector_store(chunks, bot_id)

        return len(chunks)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error scraping website: {str(e)}"
        )

# Alias for backward compatibility
process_website_url = scrape_and_index_website