from pydantic import BaseModel

class ChatRequest(BaseModel):
    bot_id: str
    question: str

class ChatResponse(BaseModel):
    bot_id: str
    question: str
    answer: str