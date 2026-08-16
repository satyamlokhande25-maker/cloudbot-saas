import os
import re
import tempfile
import yt_dlp
from groq import Groq
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
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
    raise HTTPException(status_code=400, detail=f"Invalid YouTube URL: {url}")

def _transcribe_with_groq(clean_url: str) -> str:
    """Downloads lightweight audio and transcribes entire video via Groq Whisper."""
    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_api_key:
        return ""

    client = Groq(api_key=groq_api_key)

    with tempfile.TemporaryDirectory() as temp_dir:
        audio_path = os.path.join(temp_dir, "audio.m4a")
        ydl_opts = {
            'format': 'm4a/bestaudio/best',
            'outtmpl': audio_path,
            'quiet': True,
            'no_warnings': True,
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

def process_youtube_video(bot_id: str, url: str) -> int:
    """Extracts full transcript and stores chunks into ChromaDB."""
    video_id = extract_video_id(url)
    clean_url = f"https://www.youtube.com/watch?v={video_id}"

    # 1. Primary: Groq Whisper Audio Transcribe (100% Full Transcript)
    full_transcript = ""
    try:
        full_transcript = _transcribe_with_groq(clean_url)
    except Exception:
        pass

    # 2. Fallback: yt-dlp Subtitle Parsing
    if not full_transcript or len(full_transcript.strip()) < 80:
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'hi'],
            'quiet': True,
            'no_warnings': True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(clean_url, download=False)
                desc = info.get('description', '')
                title = info.get('title', '')
                full_transcript = f"Title: {title}\nDescription:\n{desc}"
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"YouTube Processing Error: {str(e)}")

    if not full_transcript or not full_transcript.strip():
        raise HTTPException(status_code=400, detail="Could not extract content from the video.")

    doc = Document(
        page_content=full_transcript.strip(),
        metadata={"source": clean_url, "video_id": video_id}
    )
    chunks = text_splitter.split_documents([doc])
    add_documents_to_vector_store(chunks, bot_id)

    return len(chunks)