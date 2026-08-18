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
        # 1. Verify Bot Existence / Auto-create if missing (e.g. test_bot_1)
        bot = db.query(Bot).filter(Bot.id == request.bot_id).first()
        
        if not bot:
            # Fallback: यदि बॉट ID डेटाबेस में नहीं है, तो पहला मौजूद यूजर ढूंढकर बॉट रजिस्टर करें
            first_user = db.query(User).first()
            if not first_user:
                first_user = User(
                    id=f"usr_{uuid.uuid4().hex[:8]}",
                    email="admin@cloudbot.local",
                    password_hash="system_fallback_hash"
                )
                db.add(first_user)
                db.commit()
                db.refresh(first_user)
            
            bot = Bot(
                id=request.bot_id,
                user_id=first_user.id,
                name="Default Assistant",
                system_prompt="You are a helpful AI assistant.",
                temperature=0.2
            )
            db.add(bot)
            db.commit()
            db.refresh(bot)

        # 2. Check usage limit safely
        if bot.owner:
            if bot.owner.message_count >= bot.owner.message_limit:
                raise HTTPException(
                    status_code=429,
                    detail="Free tier message limit reached (50/50). Please upgrade or reset to continue."
                )
            bot.owner.message_count += 1
            db.commit()

        # 3. Generate Grounded AI Answer
        answer = generate_rag_response(bot_id=request.bot_id, question=request.question)

        # 4. Store Conversation History in DB
        try:
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
        except Exception:
            db.rollback()

        return ChatResponse(
            bot_id=request.bot_id,
            question=request.question,
            answer=answer
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@router.get("/history/{bot_id}")
def get_chat_history(bot_id: str, db: Session = Depends(get_db)):
    """Fetches ordered conversation history for the Logs dashboard."""
    try:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat logs: {str(e)}")