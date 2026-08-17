import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.db.vector_store import add_documents_to_vector_store

# 🔹 Optimal chunking settings
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)

def scrape_and_index_website(bot_id: str, url: str) -> int:
    """Scrapes clean text from a webpage, filters boilerplate, and indexes chunks."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }

    try:
        clean_url = str(url).strip()
        response = requests.get(clean_url, headers=headers, timeout=12)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to fetch webpage. HTTP Status: {response.status_code}"
            )

        soup = BeautifulSoup(response.text, "html.parser")

        # 1. Remove non-content and noise elements
        for element in soup([
            "script", "style", "nav", "footer", "header", "noscript", 
            "aside", "form", "svg", "iframe"
        ]):
            element.decompose()

        # 2. Remove Wikipedia specific citation & navigation noise
        for noise in soup.select(".mw-editsection, .reference, .navbox, .vertical-navbox, .reflist, #toc"):
            noise.decompose()

        # 3. Extract readable paragraphs and headings only
        content_tags = soup.find_all(["h1", "h2", "h3", "p", "li"])
        extracted_lines = []
        for tag in content_tags:
            line = tag.get_text(separator=" ", strip=True)
            if len(line) > 30:  # Ignore tiny navigational snippets
                extracted_lines.append(line)

        clean_text = "\n\n".join(extracted_lines)

        # Fallback to general text if semantic tags are sparse
        if not clean_text.strip():
            clean_text = soup.get_text(separator=" ", strip=True)

        if not clean_text.strip():
            raise HTTPException(status_code=400, detail="No readable text found on the webpage.")

        # Limit to top 25,000 characters for instant indexing
        trimmed_text = clean_text[:25000]

        doc = Document(page_content=trimmed_text, metadata={"source": clean_url})
        chunks = text_splitter.split_documents([doc])
        
        # Save to bot-isolated vector store
        add_documents_to_vector_store(chunks, bot_id)

        return len(chunks)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error scraping website: {str(e)}"
        )

# Alias for backward compatibility with train routes
process_website_url = scrape_and_index_website