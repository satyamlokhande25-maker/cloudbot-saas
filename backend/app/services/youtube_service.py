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

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

def extract_video_id(url: str) -> str:
    """Extracts 11-character video ID from any YouTube URL."""
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

def _fetch_subtitles_via_android_client(video_id: str) -> str:
    """Uses Android client context which bypasses datacenter IP restrictions."""
    url = "https://www.youtube.com/youtubei/v1/player"
    payload = {
        "context": {
            "client": {
                "clientName": "ANDROID",
                "clientVersion": "19.09.37",
                "hl": "en",
                "gl": "US"
            }
        },
        "videoId": video_id
    }
    headers = {
        "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=12)
        if resp.status_code != 200:
            return ""

        data = resp.json()
        captions = data.get("captions", {}).get("playerCaptionsTracklistRenderer", {})
        tracks = captions.get("captionTracks", [])
        if not tracks:
            return ""

        base_url = tracks[0].get("baseUrl")
        for track in tracks:
            lang = track.get("languageCode", "").lower()
            if lang in ["en", "en-us", "en-gb", "hi"]:
                base_url = track.get("baseUrl")
                break

        if not base_url:
            return ""

        sub_resp = requests.get(base_url, timeout=12)
        if sub_resp.status_code == 200 and sub_resp.text:
            root = ET.fromstring(sub_resp.text)
            texts = [html.unescape(elem.text) for elem in root.findall(".//text") if elem.text]
            return " ".join(texts)
    except Exception:
        pass
    return ""

def _fetch_subtitles_via_transcript_api(video_id: str) -> str:
    """Fetches transcript using youtube-transcript-api."""
    try:
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'hi'])
        except Exception:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        
        return " ".join([item.get("text", "") for item in transcript_list])
    except Exception:
        pass
    return ""

def _fetch_video_details_fallback(video_id: str, clean_url: str) -> str:
    """Extracts title, author, and description if subtitles are blocked."""
    content_parts = []
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(f"https://noembed.com/embed?url={clean_url}", headers=headers, timeout=8)
        if resp.status_code == 200:
            data = resp.json()
            title = data.get("title", "")
            author = data.get("author_name", "")
            if title:
                content_parts.append(f"Title: {title}\nAuthor/Channel: {author}")
    except Exception:
        pass

    try:
        html_resp = requests.get(f"https://www.youtube.com/watch?v={video_id}", headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        desc_match = re.search(r'"shortDescription":"(.*?)"', html_resp.text)
        if desc_match:
            desc = desc_match.group(1).encode().decode('unicode-escape')
            content_parts.append(f"Description:\n{desc}")
    except Exception:
        pass

    return "\n\n".join(content_parts)

def process_youtube_video(bot_id: str, url: str) -> int:
    """Processes video transcripts with multi-client bypass and stores into ChromaDB."""
    video_id = extract_video_id(url)
    clean_url = f"https://www.youtube.com/watch?v={video_id}"
    
    # 1. Android client innerTube extraction
    full_text = _fetch_subtitles_via_android_client(video_id)

    # 2. Transcript API fallback
    if not full_text or len(full_text.strip()) < 50:
        full_text = _fetch_subtitles_via_transcript_api(video_id)

    # 3. Comprehensive video metadata and description fallback
    if not full_text or len(full_text.strip()) < 50:
        full_text = _fetch_video_details_fallback(video_id, clean_url)

    if not full_text or not full_text.strip():
        raise HTTPException(
            status_code=400,
            detail=f"Unable to extract content for video ({video_id}). Please check the link."
        )

    doc = Document(
        page_content=full_text.strip(),
        metadata={"source": clean_url, "video_id": video_id}
    )
    chunks = text_splitter.split_documents([doc])
    add_documents_to_vector_store(chunks, bot_id)

    return len(chunks)