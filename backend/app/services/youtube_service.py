import re
import json
import urllib.request
from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
import yt_dlp
from app.db.vector_store import add_documents_to_vector_store

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

def extract_video_id(url: str) -> str:
    """Extracts 11-character YouTube video ID."""
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

def fetch_transcript_via_ytdlp(url: str) -> str:
    """Uses yt-dlp to extract English/Hindi/Auto-captions bypassing YouTube bot blocks."""
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en', 'en-US', 'en-GB', 'hi'],
        'quiet': True,
        'no_warnings': True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Unable to fetch video info from YouTube: {str(e)}")

        subtitles = info.get('subtitles', {})
        auto_captions = info.get('automatic_captions', {})

        # Priority: Subtitles -> Auto Captions
        selected_track = None
        for lang in ['en', 'en-US', 'en-GB', 'hi']:
            if lang in subtitles:
                selected_track = subtitles[lang]
                break
            if lang in auto_captions:
                selected_track = auto_captions[lang]
                break

        # Fallback to any available language track
        if not selected_track:
            if subtitles:
                selected_track = list(subtitles.values())[0]
            elif auto_captions:
                selected_track = list(auto_captions.values())[0]

        if not selected_track:
            raise HTTPException(
                status_code=400,
                detail="This YouTube video does not contain any subtitles or closed captions (CC)."
            )

        # Find JSON3 or JSON / VTT subtitle format URL
        sub_url = None
        for format_item in selected_track:
            if format_item.get('ext') == 'json3':
                sub_url = format_item.get('url')
                break
            elif format_item.get('ext') in ['vtt', 'srv3', 'ttml']:
                sub_url = format_item.get('url')

        if not sub_url:
            sub_url = selected_track[0].get('url')

        # Download and parse subtitle content
        req = urllib.request.Request(
            sub_url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            data = response.read().decode('utf-8')

        # Parse JSON3 or plain text
        raw_text_parts = []
        try:
            json_data = json.loads(data)
            events = json_data.get('events', [])
            for event in events:
                segs = event.get('segs', [])
                for seg in segs:
                    utf8_text = seg.get('utf8', '').strip()
                    if utf8_text and utf8_text != '\n':
                        raw_text_parts.append(utf8_text)
        except Exception:
            # Clean VTT/SRT tags if plain text
            clean_text = re.sub(r'<[^>]+>', '', data)
            clean_text = re.sub(r'\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}', '', clean_text)
            raw_text_parts = [clean_text]

        return " ".join(raw_text_parts)

def process_youtube_video(bot_id: str, url: str) -> int:
    """Processes video transcripts and saves them into ChromaDB."""
    video_id = extract_video_id(url)
    clean_url = f"https://www.youtube.com/watch?v={video_id}"

    full_transcript = fetch_transcript_via_ytdlp(clean_url)

    if not full_transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript extracted was empty.")

    # Save to Vector Store
    doc = Document(page_content=full_transcript, metadata={"source": clean_url, "video_id": video_id})
    chunks = text_splitter.split_documents([doc])
    add_documents_to_vector_store(chunks, bot_id)

    return len(chunks)