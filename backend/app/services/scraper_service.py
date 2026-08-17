import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.db.vector_store import add_documents_to_vector_store

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=100)

def scrape_and_index_website(bot_id: str, url: str) -> int:
    """Fast, lightweight scraper that indexes content in 2-3 seconds."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    try:
        clean_url = str(url).strip()
        response = requests.get(clean_url, headers=headers, timeout=8)
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to fetch webpage. Status: {response.status_code}")

        soup = BeautifulSoup(response.text, "html.parser")

        # 🔹 Remove scripts, styles, references, tables, sidebars
        for el in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "table", "form", "svg"]):
            el.decompose()

        for noise in soup.select(".mw-editsection, .reference, .navbox, .vertical-navbox, .reflist, #toc"):
            noise.decompose()

        # 🔹 Collect readable content
        content_tags = soup.find_all(["h1", "h2", "h3", "p"])
        lines = [t.get_text(separator=" ", strip=True) for t in content_tags if len(t.get_text(strip=True)) > 30]

        clean_text = "\n\n".join(lines)
        if not clean_text.strip():
            clean_text = soup.get_text(separator=" ", strip=True)

        if not clean_text.strip():
            raise HTTPException(status_code=400, detail="No readable text found on webpage.")

        # Limit to 45,000 characters (covers 95% of core knowledge in ~35 chunks)
        trimmed_text = clean_text[:45000]

        doc = Document(page_content=trimmed_text, metadata={"source": clean_url})
        chunks = text_splitter.split_documents([doc])
        
        add_documents_to_vector_store(chunks, bot_id)
        return len(chunks)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping error: {str(e)}")

process_website_url = scrape_and_index_website