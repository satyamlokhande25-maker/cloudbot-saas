import re
import html
import json
import requests
import xml.etree.ElementTree as ET
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from youtube_transcript_api import YouTubeTranscriptApi
from app.db.vector_store import add_documents_to_vector_store

text_splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=150)

def extract_video_id(url: str) -> str:
    """Extracts 11-character video ID from YouTube URL."""
    clean = str(url).strip()
    patterns = [
        r"(?:v=|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/|^)([a-zA-Z0-9_-]{11})(?:\?|&|$|\/)",
        r"^([a-zA-Z0-9_-]{11})$"
    ]
    for pattern in patterns:
        match = re.search(pattern, clean)
        if match:
            return match.group(1)
    raise HTTPException(status_code=400, detail=f"Invalid YouTube URL format: {url}")

def _fetch_subtitles_innertube(video_id: str) -> str:
    """Attempts InnerTube iOS/Android player fetch."""
    url = "https://www.youtube.com/youtubei/v1/player"
    payload = {
        "context": {
            "client": {
                "clientName": "IOS",
                "clientVersion": "19.29.1",
                "hl": "en",
                "gl": "US"
            }
        },
        "videoId": video_id
    }
    headers = {
        "User-Agent": "com.google.ios.youtube/19.29.1 (iPhone14,3; U; CPU iOS 17_5_1 like Mac OS X)",
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=8)
        if resp.status_code == 200:
            data = resp.json()
            captions = data.get("captions", {}).get("playerCaptionsTracklistRenderer", {})
            tracks = captions.get("captionTracks", [])
            if tracks:
                base_url = tracks[0].get("baseUrl")
                for track in tracks:
                    if track.get("languageCode", "").lower() in ["en", "en-us", "hi"]:
                        base_url = track.get("baseUrl")
                        break
                if base_url:
                    sub_resp = requests.get(base_url, timeout=8)
                    if sub_resp.status_code == 200 and sub_resp.text:
                        root = ET.fromstring(sub_resp.text)
                        texts = [html.unescape(e.text) for e in root.findall(".//text") if e.text]
                        if texts:
                            return " ".join(texts)
    except Exception:
        pass
    return ""

def _fetch_subtitles_api(video_id: str) -> str:
    """Attempts youtube-transcript-api."""
    try:
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'hi'])
        except Exception:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return " ".join([t.get("text", "") for t in transcript if t.get("text")])
    except Exception:
        return ""

def _fetch_video_metadata_full(video_id: str, clean_url: str) -> str:
    """Extracts rich video metadata and description to ensure indexing always succeeds."""
    parts = []
    
    # 1. Fetch title and author via oEmbed
    try:
        resp = requests.get(f"https://noembed.com/embed?url={clean_url}", timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            title = data.get("title", "")
            author = data.get("author_name", "")
            if title:
                parts.append(f"Video Title: {title}\nChannel: {author}")
    except Exception:
        pass

    # 2. Fetch full description and chapters from HTML
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        html_resp = requests.get(f"https://www.youtube.com/watch?v={video_id}", headers=headers, timeout=8)
        
        desc_match = re.search(r'"shortDescription":"(.*?)"', html_resp.text)
        if desc_match:
            desc = desc_match.group(1).encode().decode('unicode-escape')
            parts.append(f"Video Content & Description:\n{desc}")
            
        title_match = re.search(r'"title":"(.*?)"', html_resp.text)
        if title_match and not parts:
            parts.append(f"Video Title: {title_match.group(1)}")
    except Exception:
        pass

    return "\n\n".join(parts)

def process_youtube_video(bot_id: str, url: str) -> int:
    """Ingests YouTube video transcript or rich content into ChromaDB."""
    video_id = extract_video_id(url)
    clean_url = f"https://www.youtube.com/watch?v={video_id}"
    
    # 1. Primary: Subtitle extraction
    content = _fetch_subtitles_innertube(video_id)
    
    if not content or len(content.strip()) < 80:
        content = _fetch_subtitles_api(video_id)
        
    # 2. Fallback: Full metadata and description extraction
    if not content or len(content.strip()) < 80:
        content = _fetch_video_metadata_full(video_id, clean_url)

    if not content or not content.strip():
        content = f"YouTube Video Reference: {clean_url} (Video ID: {video_id})."

    doc = Document(
        page_content=content.strip(),
        metadata={"source": clean_url, "video_id": video_id}
    )
    chunks = text_splitter.split_documents([doc])
    add_documents_to_vector_store(chunks, bot_id)

    return max(len(chunks), 1)