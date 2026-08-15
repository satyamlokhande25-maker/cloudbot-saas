from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BotCreateRequest(BaseModel):
    name: str = Field(..., example="Customer Support Bot")
    system_prompt: Optional[str] = "You are a helpful AI customer support assistant."
    temperature: Optional[float] = 0.2
    theme_color: Optional[str] = "#4f46e5"

class BotResponse(BaseModel):
    id: str
    user_id: str
    name: str
    system_prompt: Optional[str]
    temperature: Optional[float]
    theme_color: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True