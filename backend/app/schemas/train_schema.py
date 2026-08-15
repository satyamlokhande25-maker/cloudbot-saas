from pydantic import BaseModel, HttpUrl

class UrlTrainRequest(BaseModel):
    bot_id: str
    url: HttpUrl

class YouTubeTrainRequest(BaseModel):
    bot_id: str
    youtube_url: HttpUrl

class TrainResponse(BaseModel):
    status: str
    message: str
    chunks_indexed: int