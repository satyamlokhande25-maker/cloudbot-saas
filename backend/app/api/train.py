from fastapi import APIRouter, UploadFile, File, Depends
from app.schemas.train_schema import UrlTrainRequest, YouTubeTrainRequest, TrainResponse
from app.services.pdf_service import process_pdf_file
from app.services.scraper_service import scrape_and_index_website
from app.services.youtube_service import process_youtube_video
from app.core.security import get_current_user

router = APIRouter(prefix="/train", tags=["Training / Ingestion"])

@router.post("/website", response_model=TrainResponse)
def train_website_endpoint(request: UrlTrainRequest, current_user: dict = Depends(get_current_user)):
    chunks_count = scrape_and_index_website(request.bot_id, str(request.url))
    return TrainResponse(status="success", message="Website content indexed.", chunks_indexed=chunks_count)

@router.post("/youtube", response_model=TrainResponse)
def train_youtube_endpoint(request: YouTubeTrainRequest, current_user: dict = Depends(get_current_user)):
    chunks_count = process_youtube_video(request.bot_id, str(request.youtube_url))
    return TrainResponse(status="success", message="YouTube transcript indexed.", chunks_indexed=chunks_count)

@router.post("/pdf/{bot_id}", response_model=TrainResponse)
def train_pdf_endpoint(bot_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    chunks_count = process_pdf_file(bot_id, file)
    return TrainResponse(status="success", message="PDF processed successfully.", chunks_indexed=chunks_count)