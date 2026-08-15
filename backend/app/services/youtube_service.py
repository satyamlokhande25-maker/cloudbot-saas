import re
import json
import requests
import xml.etree.ElementTree as ET
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
from app.db.vector_store import add_documents_to_vector_store

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

def extract_video_id(url: str) -> str:
    """Extracts 11-character YouTube video ID safely from standard, short, or shorts URLs."""
    clean = str(url).strip()
    patterns = [
        r"(?:v=|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/|^)([a-zA-Z0-9_-]{11})(?:\?|&|$|\/)",
        r"^([a-zA-Z0-9_-]{11})$"
    ]
    for pattern in patterns:
        match = re.search(pattern, clean)
        if match:
            return match.group(1)
    raise HTTPException(status_code=400, detail=f"Invalid YouTube URL: '{url}'")

def _fetch_subtitles_direct_html(video_id: str) -> str:
    """Bypasses datacenter bot blocks by fetching captions directly from public YouTube HTML player response."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if "captionTracks" not in resp.text:
            return ""

        match = re.search(r'"captionTracks":\s*(\[.*?\])', resp.text)
        if not match:
            return ""

        tracks = json.loads(match.group(1))
        if not tracks:
            return ""

        base_url = tracks[0].get("baseUrl")
        for track in tracks:
            if track.get("languageCode") in ["en", "en-US", "en-GB", "hi"]:
                base_url = track.get("baseUrl")
                break

        if not base_url:
            return ""

        caption_resp = requests.get(base_url, headers=headers, timeout=10)
        root = ET.fromstring(caption_resp.text)
        texts = [elem.text for elem in root.findall(".//text") if elem.text]
        return " ".join(texts)
    except Exception:
        return ""

def _fetch_via_ytdlp(clean_url: str) -> str:
    """Extracts captions using yt-dlp."""
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en', 'en-US', 'en-GB', 'hi'],
        'quiet': True,
        'no_warnings': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(clean_url, download=False)
            subtitles = info.get('subtitles', {}) or info.get('automatic_captions', {})
            if not subtitles:
                return ""

            selected_track = None
            for lang in ['en', 'en-US', 'en-GB', 'hi']:
                if lang in subtitles:
                    selected_track = subtitles[lang]
                    break
            if not selected_track:
                selected_track = list(subtitles.values())[0]

            sub_url = selected_track[0].get('url')
            if sub_url:
                resp = requests.get(sub_url, timeout=10)
                if resp.status_code == 200:
                    clean_text = re.sub(r'<[^>]+>', '', resp.text)
                    clean_text = re.sub(r'\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}', '', clean_text)
                    return " ".join(clean_text.split())
    except Exception:
        pass
    return ""

def process_youtube_video(bot_id: str, url: str) -> int:
    """Processes video transcripts with multi-layer fallback and saves them into ChromaDB."""
    video_id = extract_video_id(url)
    clean_url = f"https://www.youtube.com/watch?v={video_id}"
    raw_text = ""

    # Method 1: YouTubeTranscriptApi
    try:
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'hi'])
        except Exception:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        raw_text = " ".join([item.get("text", "") for item in transcript_list])
    except Exception:
        pass

    # Method 2: Direct TimedText HTML Scrape (Bypasses IP/Bot block)
    if not raw_text or not raw_text.strip():
        raw_text = _fetch_subtitles_direct_html(video_id)

    # Method 3: yt-dlp fallback
    if not raw_text or not raw_text.strip():
        raw_text = _fetch_via_ytdlp(clean_url)

    # Method 4: Fallback Video Metadata extraction if captions are heavily blocked
    if not raw_text or not raw_text.strip():
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            resp = requests.get(f"https://noembed.com/embed?url={clean_url}", headers=headers, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                title = data.get("title", "")
                author = data.get("author_name", "")
                if title:
                    raw_text = f"YouTube Video Title: {title}. Video Creator / Channel: {author}. Content overview and discussion for video id {video_id}."
        except Exception:
            pass

    if not raw_text or not raw_text.strip():
        raise HTTPException(
            status_code=400,
            detail=f"Unable to extract captions for video ({video_id}). Please test with a video that has public subtitles/CC enabled."
        )

    # Save to Vector Store
    doc = Document(page_content=raw_text, metadata={"source": clean_url, "video_id": video_id})
    chunks = text_splitter.split_documents([doc])
    add_documents_to_vector_store(chunks, bot_id)

    return len(chunks)