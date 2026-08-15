from fastapi import APIRouter, UploadFile, File, HTTPException
from app.schemas.train_schema import UrlTrainRequest, YouTubeTrainRequest, TrainResponse
from app.services.pdf_service import process_pdf_file
from app.services.youtube_service import process_youtube_video

# Scraper service import fallback
try:
    from app.services.scraper_service import process_website_url
except ImportError:
    from app.services.scraper_service import scrape_and_index_website as process_website_url

router = APIRouter(prefix="/train", tags=["Training / Ingestion"])

@router.post("/website", response_model=TrainResponse)
def train_website_endpoint(request: UrlTrainRequest):
    try:
        chunks_count = process_website_url(request.bot_id, str(request.url))
        return TrainResponse(
            status="success",
            message="Website content indexed.",
            chunks_indexed=chunks_count
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/youtube", response_model=TrainResponse)
def train_youtube_endpoint(request: YouTubeTrainRequest):
    try:
        chunks_count = process_youtube_video(request.bot_id, str(request.youtube_url))
        return TrainResponse(
            status="success",
            message="YouTube transcript indexed.",
            chunks_indexed=chunks_count
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pdf/{bot_id}", response_model=TrainResponse)
async def train_pdf_endpoint(bot_id: str, file: UploadFile = File(...)):
    try:
        chunks_count = process_pdf_file(bot_id, file)
        return TrainResponse(
            status="success",
            message="PDF processed successfully.",
            chunks_indexed=chunks_count
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))