import time
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.db.vector_store import add_documents_to_vector_store

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150,
    separators=["\n\n", "\n", ". ", " ", ""]
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9"
}

def _extract_page_content(html: str) -> tuple[str, list[str], str]:
    """Cleans HTML and extracts meaningful body text and internal links."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove non-content and noise elements
    for el in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "form", "svg", "iframe"]):
        el.decompose()

    for noise in soup.select(".mw-editsection, .reference, .navbox, .vertical-navbox, .reflist, #toc"):
        noise.decompose()

    # Extract clean text
    tags = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "table", "article", "section"])
    lines = [t.get_text(separator=" ", strip=True) for t in tags if len(t.get_text(strip=True)) > 20]
    
    clean_text = "\n\n".join(lines)
    if not clean_text.strip():
        clean_text = soup.get_text(separator=" ", strip=True)

    # Extract all links on page
    links = [a.get("href") for a in soup.find_all("a", href=True)]
    return clean_text.strip(), links

def scrape_and_index_website(bot_id: str, start_url: str, max_pages: int = 5) -> int:
    """Recursively crawls the target website domain across multiple linked pages."""
    clean_start_url = str(start_url).strip()
    parsed_start = urlparse(clean_start_url)
    base_domain = parsed_start.netloc

    visited_urls = set()
    queue = [clean_start_url]
    all_documents = []

    while queue and len(visited_urls) < max_pages:
        current_url = queue.pop(0)
        if current_url in visited_urls:
            continue

        visited_urls.add(current_url)

        try:
            resp = requests.get(current_url, headers=HEADERS, timeout=12)
            if resp.status_code != 200:
                continue

            page_text, links = _extract_page_content(resp.text)
            if page_text and len(page_text) > 50:
                # Add extracted text as Document
                all_documents.append(
                    Document(page_content=page_text[:50000], metadata={"source": current_url})
                )

            # Discover internal links for multi-page crawling
            for link in links:
                full_url = urljoin(current_url, link).split("#")[0].split("?")[0]
                parsed_link = urlparse(full_url)
                
                # Stay within the same domain and avoid media/file downloads
                if parsed_link.netloc == base_domain:
                    ext = parsed_link.path.split(".")[-1].lower()
                    if ext not in ["png", "jpg", "jpeg", "pdf", "zip", "svg", "css", "js", "mp4"]:
                        if full_url not in visited_urls and full_url not in queue:
                            queue.append(full_url)

            time.sleep(0.1)  # Respectful crawling delay

        except Exception:
            continue

    if not all_documents:
        raise HTTPException(status_code=400, detail="Could not extract readable text from the provided URL or its subpages.")

    # Split all crawled documents into semantic chunks
    chunks = text_splitter.split_documents(all_documents)
    add_documents_to_vector_store(chunks, bot_id)

    return len(chunks)

process_website_url = scrape_and_index_website