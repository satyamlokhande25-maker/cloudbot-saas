import uuid
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
        # 1. बॉट और उसके ओनर (User) की जानकारी निकालें
        bot = db.query(Bot).filter(Bot.id == request.bot_id).first()
        if bot and bot.owner:
            user = bot.owner
            # 2. फ्री टियर लिमिट चेक करें (उदा. 50 मैसेज)
            if user.message_count >= user.message_limit:
                raise HTTPException(
                    status_code=429,
                    detail="Free tier message limit reached (50/50). Please upgrade or reset to continue."
                )
            # यूज़र का यूसेज काउंट बढ़ाएँ
            user.message_count += 1
            db.commit()

        # 3. RAG पाइपलाइन से जवाब जनरेट करें
        answer = generate_rag_response(bot_id=request.bot_id, question=request.question)
        
        # 4. मैसेज डेटाबेस में सेव करें (Logs के लिए)
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