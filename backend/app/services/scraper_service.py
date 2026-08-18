import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.db.vector_store import add_documents_to_vector_store

# Optimal chunk size and overlap for precise semantic retrieval
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=700,
    chunk_overlap=150,
    separators=["\n\n", "\n", ". ", " ", ""]
)

def scrape_and_index_website(bot_id: str, url: str) -> int:
    """Scrapes clean, full-depth content from a webpage and indexes chunks into ChromaDB."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }

    try:
        clean_url = str(url).strip()
        response = requests.get(clean_url, headers=headers, timeout=15)
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to fetch webpage. Status: {response.status_code}")

        soup = BeautifulSoup(response.text, "html.parser")

        # Decompose scripts, styles, forms, navigation, and visual assets
        for el in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "form", "svg", "iframe"]):
            el.decompose()

        # Clean noise tags specific to Wikipedia and heavy web layouts
        for noise in soup.select(".mw-editsection, .reference, .navbox, .vertical-navbox, .reflist, #toc"):
            noise.decompose()

        # Extract text across headings, paragraphs, and list elements
        content_tags = soup.find_all(["h1", "h2", "h3", "h4", "p", "li"])
        lines = []
        for t in content_tags:
            text = t.get_text(separator=" ", strip=True)
            if len(text) > 25:
                lines.append(text)

        clean_text = "\n\n".join(lines)
        if not clean_text.strip():
            clean_text = soup.get_text(separator=" ", strip=True)

        if not clean_text.strip():
            raise HTTPException(status_code=400, detail="No readable text found on webpage.")

        # Extended character limit to capture comprehensive long-form content (~150+ chunks)
        trimmed_text = clean_text[:120000]

        doc = Document(page_content=trimmed_text, metadata={"source": clean_url})
        chunks = text_splitter.split_documents([doc])
        
        add_documents_to_vector_store(chunks, bot_id)
        return len(chunks)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping error: {str(e)}")

# Backward compatibility alias
process_website_url = scrape_and_index_website