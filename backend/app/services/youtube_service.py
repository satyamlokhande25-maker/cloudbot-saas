import os
import re
import json
import tempfile
import requests
import xml.etree.ElementTree as ET
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
from groq import Groq
from app.db.vector_store import add_documents_to_vector_store

text_splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=150)

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
    raise HTTPException(status_code=400, detail=f"Invalid YouTube URL: {url}")

def _fetch_subtitles_direct_html(video_id: str) -> str:
    """Bypasses datacenter bot blocks by fetching captions directly from public YouTube HTML player."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        resp = requests.get(url, headers=headers, timeout=8)
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
            if track.get("languageCode") in ["en", "en-US", "hi"]:
                base_url = track.get("baseUrl")
                break

        if not base_url:
            return ""

        caption_resp = requests.get(base_url, headers=headers, timeout=8)
        root = ET.fromstring(caption_resp.text)
        texts = [elem.text for elem in root.findall(".//text") if elem.text]
        return " ".join(texts)
    except Exception:
        return ""

def _transcribe_with_groq(clean_url: str) -> str:
    """Downloads lightweight audio snippet and transcribes via Groq Whisper."""
    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_api_key:
        return ""

    try:
        client = Groq(api_key=groq_api_key)
        with tempfile.TemporaryDirectory() as temp_dir:
            audio_path = os.path.join(temp_dir, "audio.m4a")
            ydl_opts = {
                'format': 'm4a/bestaudio/best',
                'outtmpl': audio_path,
                'quiet': True,
                'no_warnings': True,
                'nocheckcertificate': True
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([clean_url])

            if not os.path.exists(audio_path):
                return ""

            with open(audio_path, "rb") as file:
                transcription = client.audio.transcriptions.create(
                    file=(os.path.basename(audio_path), file.read()),
                    model="whisper-large-v3-turbo",
                    response_format="text",
                    language="en"
                )
                return str(transcription)
    except Exception:
        return ""

def process_youtube_video(bot_id: str, url: str) -> int:
    """Extracts transcript with multi-tier fallback and saves chunks into ChromaDB."""
    video_id = extract_video_id(url)
    clean_url = f"https://www.youtube.com/watch?v={video_id}"
    full_transcript = ""

    # 1. Tier 1: YouTube Transcript API
    try:
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'hi'])
        except Exception:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        full_transcript = " ".join([item.get("text", "") for item in transcript_list])
    except Exception:
        pass

    # 2. Tier 2: Direct TimedText XML (Bypasses bot blocks)
    if not full_transcript or len(full_transcript.strip()) < 50:
        full_transcript = _fetch_subtitles_direct_html(video_id)

    # 3. Tier 3: Groq Whisper Audio Transcribe
    if not full_transcript or len(full_transcript.strip()) < 50:
        full_transcript = _transcribe_with_groq(clean_url)

    # 4. Tier 4: Metadata Fallback (Title & Description)
    if not full_transcript or len(full_transcript.strip()) < 50:
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            resp = requests.get(f"https://noembed.com/embed?url={clean_url}", headers=headers, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                title = data.get("title", "")
                author = data.get("author_name", "")
                if title:
                    full_transcript = f"YouTube Video: {title}\nAuthor/Channel: {author}\nVideo Link: {clean_url}"
        except Exception:
            pass

    if not full_transcript or not full_transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Unable to extract text or subtitles from this video. Please try a video with CC enabled."
        )

    doc = Document(
        page_content=full_transcript.strip(),
        metadata={"source": clean_url, "video_id": video_id}
    )
    chunks = text_splitter.split_documents([doc])
    add_documents_to_vector_store(chunks, bot_id)

    return len(chunks)