import uuid
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ChatMessage, Bot, User
from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.rag_service import generate_rag_response

router = APIRouter(prefix="/chat", tags=["Chat & Inference"])

@router.post("/", response_model=ChatResponse)
def chat_with_bot(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        
        bot = db.query(Bot).filter(Bot.id == request.bot_id).first()
        if bot and bot.owner:
            user = bot.owner
            
            if user.message_count >= user.message_limit:
                raise HTTPException(
                    status_code=429,
                    detail="Free tier message limit reached (50/50). Please upgrade or reset to continue."
                )
            
            user.message_count += 1
            db.commit()

        
        answer = generate_rag_response(bot_id=request.bot_id, question=request.question)
        
        
        user_msg = ChatMessage(
            id=f"msg_{uuid.uuid4().hex[:12]}",
            bot_id=request.bot_id,
            sender="user",
            message=request.question
        )
        bot_msg = ChatMessage(
            id=f"msg_{uuid.uuid4().hex[:12]}",
            bot_id=request.bot_id,
            sender="bot",
            message=answer
        )
        
        db.add(user_msg)
        db.add(bot_msg)
        db.commit()
        
        return ChatResponse(
            bot_id=request.bot_id,
            question=request.question,
            answer=answer
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{bot_id}")
def get_chat_history(bot_id: str, db: Session = Depends(get_db)):
    
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.bot_id == bot_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [
        {
            "id": msg.id,
            "sender": msg.sender,
            "message": msg.message,
            "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M:%S") if msg.created_at else ""
        }
        for msg in messages
    ]