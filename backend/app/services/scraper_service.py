import time
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
from app.db.vector_store import add_documents_to_vector_store

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=700,
    chunk_overlap=150,
    separators=["\n\n", "\n", ". ", " ", ""]
)

def _init_driver():
    """Initializes a lightweight headless Chrome instance."""
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--blink-settings=imagesEnabled=false")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
    
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)

def scrape_and_index_website(bot_id: str, url: str) -> int:
    """Renders full JavaScript pages via Selenium and indexes structured text."""
    driver = None
    try:
        clean_url = str(url).strip()
        driver = _init_driver()
        driver.set_page_load_timeout(30)
        driver.get(clean_url)
        
        # JS कंटेंट रेंडर होने का इंतज़ार
        time.sleep(2)
        
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, "html.parser")

        for el in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "form", "svg", "iframe"]):
            el.decompose()

        for noise in soup.select(".mw-editsection, .reference, .navbox, .vertical-navbox, .reflist, #toc"):
            noise.decompose()

        content_tags = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "article", "section"])
        extracted_lines = []
        for tag in content_tags:
            text = tag.get_text(separator=" ", strip=True)
            if len(text) > 25:
                extracted_lines.append(text)

        clean_text = "\n\n".join(extracted_lines)
        if not clean_text.strip():
            clean_text = soup.get_text(separator=" ", strip=True)

        if not clean_text.strip():
            raise HTTPException(status_code=400, detail="No readable content found on the webpage.")

        trimmed_text = clean_text[:150000]
        doc = Document(page_content=trimmed_text, metadata={"source": clean_url})
        chunks = text_splitter.split_documents([doc])

        add_documents_to_vector_store(chunks, bot_id)
        return len(chunks)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Selenium scraping failed: {str(e)}")
    finally:
        if driver:
            driver.quit()

process_website_url = scrape_and_index_website