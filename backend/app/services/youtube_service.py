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
    """Extracts 11-character video ID from any YouTube URL format."""
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
    """Extracts full transcript via YouTube InnerTube API (Bypasses Datacenter IP restrictions)."""
    url = "https://www.youtube.com/youtubei/v1/player"
    payload = {
        "context": {
            "client": {
                "clientName": "WEB_EMBEDDED_PLAYER",
                "clientVersion": "1.20240318.01.00",
                "hl": "en",
                "gl": "US"
            }
        },
        "videoId": video_id
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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

        # Priority language selection
        selected_track = tracks[0]
        for track in tracks:
            lang = track.get("languageCode", "").lower()
            if lang in ["en", "en-us", "en-gb", "hi"]:
                selected_track = track
                break

        base_url = selected_track.get("baseUrl")
        if not base_url:
            return ""

        sub_resp = requests.get(base_url, headers=headers, timeout=12)
        root = ET.fromstring(sub_resp.text)
        texts = [html.unescape(elem.text) for elem in root.findall(".//text") if elem.text]
        return " ".join(texts)
    except Exception:
        return ""

def _fetch_via_transcript_api(video_id: str) -> str:
    """Extracts full transcript using YouTubeTranscriptApi with comprehensive language matching."""
    try:
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'en-GB', 'hi'])
        except Exception:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        
        return " ".join([item.get("text", "") for item in transcript_list])
    except Exception:
        pass
    
    # Try list_transcripts iterator
    try:
        transcript_obj = YouTubeTranscriptApi.list_transcripts(video_id)
        try:
            t = transcript_obj.find_transcript(['en', 'en-US', 'hi'])
        except Exception:
            t = transcript_obj.find_generated_transcript(['en', 'hi'])
        data = t.fetch()
        return " ".join([item.get("text", "") for item in data])
    except Exception:
        return ""

def process_youtube_video(bot_id: str, url: str) -> int:
    """Extracts complete transcript, splits into chunks, and stores into ChromaDB."""
    video_id = extract_video_id(url)
    clean_url = f"https://www.youtube.com/watch?v={video_id}"
    full_transcript = ""

    # Strategy 1: YouTubeTranscriptApi
    full_transcript = _fetch_via_transcript_api(video_id)

    # Strategy 2: Direct InnerTube Scraping (Cloud Datacenter Compatible)
    if not full_transcript or len(full_transcript.strip()) < 50:
        full_transcript = _fetch_subtitles_innertube(video_id)

    # Validate extracted content
    if not full_transcript or not full_transcript.strip():
        raise HTTPException(
            status_code=400,
            detail=f"Unable to extract captions for video ({video_id}). Please ensure the video has public English/Hindi subtitles/CC enabled."
        )

    # Create document and split into multi-part chunks
    doc = Document(
        page_content=full_transcript.strip(),
        metadata={"source": clean_url, "video_id": video_id}
    )
    chunks = text_splitter.split_documents([doc])
    
    # Store all chunks into Vector DB
    add_documents_to_vector_store(chunks, bot_id)

    return len(chunks)