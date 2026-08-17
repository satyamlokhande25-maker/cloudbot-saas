import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.db.vector_store import add_documents_to_vector_store

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)

def scrape_and_index_website(bot_id: str, url: str) -> int:
    """Scrapes clean text from a webpage with broad coverage for deep topics."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }

    try:
        clean_url = str(url).strip()
        response = requests.get(clean_url, headers=headers, timeout=15)
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to fetch webpage. HTTP Status: {response.status_code}")

        soup = BeautifulSoup(response.text, "html.parser")

        # 1. Clean boilerplate & noise
        for element in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "form", "svg", "iframe"]):
            element.decompose()

        for noise in soup.select(".mw-editsection, .reference, .navbox, .vertical-navbox, .reflist, #toc"):
            noise.decompose()

        # 2. Extract content
        content_tags = soup.find_all(["h1", "h2", "h3", "p", "li"])
        extracted_lines = [tag.get_text(separator=" ", strip=True) for tag in content_tags if len(tag.get_text(strip=True)) > 30]

        clean_text = "\n\n".join(extracted_lines)
        if not clean_text.strip():
            clean_text = soup.get_text(separator=" ", strip=True)

        if not clean_text.strip():
            raise HTTPException(status_code=400, detail="No readable text found on the webpage.")

        # 🔹 Increased to 80,000 characters to cover entire article including history & subfields
        trimmed_text = clean_text[:80000]

        doc = Document(page_content=trimmed_text, metadata={"source": clean_url})
        chunks = text_splitter.split_documents([doc])
        
        add_documents_to_vector_store(chunks, bot_id)
        return len(chunks)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scraping website: {str(e)}")

process_website_url = scrape_and_index_website