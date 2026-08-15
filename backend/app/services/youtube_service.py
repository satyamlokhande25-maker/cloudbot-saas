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

def _fetch_from_innertube(video_id: str, client_name: str, client_version: str, user_agent: str) -> str:
    """Fetches full captions using different InnerTube client contexts (iOS/Android/Web)."""
    url = "https://www.youtube.com/youtubei/v1/player"
    payload = {
        "context": {
            "client": {
                "clientName": client_name,
                "clientVersion": client_version,
                "hl": "en",
                "gl": "US"
            }
        },
        "videoId": video_id
    }
    headers = {
        "User-Agent": user_agent,
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

        selected_track = tracks[0]
        for track in tracks:
            lang = track.get("languageCode", "").lower()
            if lang in ["en", "en-us", "en-gb", "hi"]:
                selected_track = track
                break

        base_url = selected_track.get("baseUrl")
        if not base_url:
            return ""

        sub_resp = requests.get(base_url, headers={"User-Agent": user_agent}, timeout=12)
        if sub_resp.status_code == 200 and sub_resp.text:
            root = ET.fromstring(sub_resp.text)
            texts = [html.unescape(elem.text) for elem in root.findall(".//text") if elem.text]
            if texts:
                return " ".join(texts)
    except Exception:
        pass
    return ""

def _fetch_via_transcript_api(video_id: str) -> str:
    """Fetches full transcript via youtube-transcript-api."""
    try:
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'en-GB', 'hi'])
        except Exception:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        
        texts = [item.get("text", "") for item in transcript_list if item.get("text")]
        return " ".join(texts)
    except Exception:
        return ""

def _fetch_direct_timedtext(video_id: str) -> str:
    """Direct fetch from YouTube timedtext endpoint."""
    for lang in ["en", "en-US", "hi"]:
        url = f"https://www.youtube.com/api/timedtext?v={video_id}&lang={lang}&fmt=srv3"
        try:
            resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=8)
            if resp.status_code == 200 and resp.text and "<text" in resp.text:
                root = ET.fromstring(resp.text)
                texts = [html.unescape(elem.text) for elem in root.findall(".//p") + root.findall(".//text") if elem.text]
                if texts:
                    return " ".join(texts)
        except Exception:
            continue
    return ""

def process_youtube_video(bot_id: str, url: str) -> int:
    """Extracts entire video transcript across multiple anti-blocking layers and indexes chunks."""
    video_id = extract_video_id(url)
    clean_url = f"https://www.youtube.com/watch?v={video_id}"
    full_text = ""

    # Strategy 1: iOS InnerTube Context (Least blocked on Cloud IPs)
    full_text = _fetch_from_innertube(
        video_id=video_id,
        client_name="IOS",
        client_version="19.29.1",
        user_agent="com.google.ios.youtube/19.29.1 (iPhone14,3; U; CPU iOS 17_5_1 like Mac OS X)"
    )

    # Strategy 2: Android InnerTube Context
    if not full_text or len(full_text.strip()) < 100:
        full_text = _fetch_from_innertube(
            video_id=video_id,
            client_name="ANDROID",
            client_version="19.09.37",
            user_agent="com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip"
        )

    # Strategy 3: YouTubeTranscriptApi
    if not full_text or len(full_text.strip()) < 100:
        full_text = _fetch_via_transcript_api(video_id)

    # Strategy 4: Direct TimedText API
    if not full_text or len(full_text.strip()) < 100:
        full_text = _fetch_direct_timedtext(video_id)

    # Strategy 5: Web Embedded Context
    if not full_text or len(full_text.strip()) < 100:
        full_text = _fetch_from_innertube(
            video_id=video_id,
            client_name="WEB_EMBEDDED_PLAYER",
            client_version="1.20240318.01.00",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )

    if not full_text or not full_text.strip():
        raise HTTPException(
            status_code=400,
            detail=f"Unable to extract full captions for video ({video_id}). Please test with a video that has public CC/subtitles enabled."
        )

    # Create document and split into multi-part chunks
    doc = Document(
        page_content=full_text.strip(),
        metadata={"source": clean_url, "video_id": video_id}
    )
    chunks = text_splitter.split_documents([doc])
    
    # Store all chunks into Vector DB
    add_documents_to_vector_store(chunks, bot_id)

    return len(chunks)