import uuid
import json
import os
import asyncio
import httpx
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ChatMessage, Bot, User, Lead
from app.schemas.chat_schema import ChatRequest
from app.services.rag_service import generate_rag_response

router = APIRouter(prefix="/chat", tags=["Chat & Inference"])

# Environment variables for WhatsApp Integration
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "cloudbot_secret_2026")
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")
DEFAULT_BOT_ID = os.getenv("DEFAULT_WHATSAPP_BOT_ID", "test_bot_1")


# --- Schemas for Leads & Feedback ---
class LeadCreate(BaseModel):
    bot_id: str
    name: str
    email: str
    phone: Optional[str] = None

class FeedbackRequest(BaseModel):
    message_id: str
    feedback: str  # 'up' or 'down'


# ==========================================
# 0. WhatsApp Webhook Endpoints (Meta Cloud API)
# ==========================================

@router.get("/whatsapp/webhook")
async def verify_whatsapp_webhook(request: Request):
    """
    Meta Developer Portal verification handshake endpoint.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification token mismatch")


@router.post("/whatsapp/webhook")
async def receive_whatsapp_message(request: Request, db: Session = Depends(get_db)):
    """
    Receives incoming WhatsApp messages, identifies the bot, runs RAG, and sends replies.
    """
    try:
        data = await request.json()
        entry = data.get("entry", [])
        if not entry:
            return {"status": "ignored"}

        changes = entry[0].get("changes", [])
        if not changes:
            return {"status": "ignored"}

        value = changes[0].get("value", {})
        messages = value.get("messages", [])
        incoming_phone_id = value.get("metadata", {}).get("phone_number_id")

        if messages:
            msg = messages[0]
            from_number = msg.get("from")
            user_text = msg.get("text", {}).get("body", "")

            if user_text and from_number:
                # 1. Determine which Bot/Agent to route to
                target_bot_id = DEFAULT_BOT_ID

                # 2. Run Grounded RAG Pipeline
                rag_output = generate_rag_response(bot_id=target_bot_id, question=user_text)
                if isinstance(rag_output, dict):
                    bot_reply = rag_output.get("answer", "")
                else:
                    bot_reply = str(rag_output)

                # 3. Save conversation history
                try:
                    user_msg = ChatMessage(
                        id=f"msg_{uuid.uuid4().hex[:12]}",
                        bot_id=target_bot_id,
                        sender=f"whatsapp_{from_number}",
                        message=user_text
                    )
                    bot_msg = ChatMessage(
                        id=f"msg_{uuid.uuid4().hex[:12]}",
                        bot_id=target_bot_id,
                        sender="bot",
                        message=bot_reply
                    )
                    db.add(user_msg)
                    db.add(bot_msg)
                    db.commit()
                except Exception as log_err:
                    db.rollback()
                    print(f"WhatsApp DB Logging Error: {log_err}")

                # 4. Reply back to WhatsApp user
                active_token = WHATSAPP_TOKEN
                active_phone_id = PHONE_NUMBER_ID or incoming_phone_id

                if active_token and active_phone_id:
                    whatsapp_api_url = f"https://graph.facebook.com/v20.0/{active_phone_id}/messages"
                    headers = {
                        "Authorization": f"Bearer {active_token}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "messaging_product": "whatsapp",
                        "to": from_number,
                        "type": "text",
                        "text": {"body": bot_reply}
                    }
                    async with httpx.AsyncClient() as client:
                        await client.post(whatsapp_api_url, json=payload, headers=headers)

    except Exception as e:
        print(f"WhatsApp webhook processing error: {e}")

    return {"status": "success"}


# ==========================================
# 1. Lead Generation Endpoints
# ==========================================
@router.post("/lead")
def capture_lead(lead_in: LeadCreate, db: Session = Depends(get_db)):
    """Captures and stores visitor contact details for a specific bot."""
    try:
        lead = Lead(
            id=f"lead_{uuid.uuid4().hex[:10]}",
            bot_id=lead_in.bot_id,
            name=lead_in.name,
            email=lead_in.email,
            phone=lead_in.phone
        )
        db.add(lead)
        db.commit()
        return {"status": "success", "lead_id": lead.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to capture lead: {str(e)}")

@router.get("/leads/{bot_id}")
def get_leads(bot_id: str, db: Session = Depends(get_db)):
    """Retrieves all captured leads for the dashboard."""
    try:
        leads = db.query(Lead).filter(Lead.bot_id == bot_id).order_by(Lead.created_at.desc()).all()
        return [
            {
                "id": l.id,
                "name": l.name,
                "email": l.email,
                "phone": l.phone or "N/A",
                "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else ""
            }
            for l in leads
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch leads: {str(e)}")


# ==========================================
# 2. Message Feedback Endpoint
# ==========================================
@router.post("/feedback")
def submit_feedback(data: FeedbackRequest, db: Session = Depends(get_db)):
    """Saves thumbs up/down rating for a bot reply."""
    try:
        msg = db.query(ChatMessage).filter(ChatMessage.id == data.message_id).first()
        if msg:
            msg.feedback = data.feedback
            db.commit()
            return {"status": "success"}
        return {"status": "not_found"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")


# ==========================================
# 3. Live Streaming Endpoint (SSE + Human Handoff Detection)
# ==========================================
@router.post("/stream")
async def chat_stream_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """Streams word-by-word RAG tokens and detects need for human handoff."""
    try:
        # Verify Bot / Auto-create fallback
        bot = db.query(Bot).filter(Bot.id == request.bot_id).first()
        if not bot:
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

        # Check Free Tier Usage Limit
        if bot.owner:
            if bot.owner.message_count >= bot.owner.message_limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"Free tier message limit reached ({bot.owner.message_count}/{bot.owner.message_limit}). Please upgrade or reset to continue."
                )
            bot.owner.message_count += 1
            db.commit()

        # Generate Grounded RAG Answer
        rag_output = generate_rag_response(bot_id=request.bot_id, question=request.question)
        if isinstance(rag_output, dict):
            full_answer = rag_output.get("answer", "")
        else:
            full_answer = str(rag_output)

        # Human handoff trigger check
        lower_ans = full_answer.lower()
        lower_q = request.question.lower()
        handoff_required = (
            "not enough information" in lower_ans 
            or "do not have enough information" in lower_ans 
            or "human agent" in lower_q 
            or "support agent" in lower_q
        )

        bot_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        user_msg = ChatMessage(
            id=f"msg_{uuid.uuid4().hex[:12]}",
            bot_id=bot.id,
            sender="user",
            message=request.question
        )
        bot_msg = ChatMessage(
            id=bot_msg_id,
            bot_id=bot.id,
            sender="bot",
            message=full_answer
        )
        db.add(user_msg)
        db.add(bot_msg)
        db.commit()

        async def event_generator():
            words = full_answer.split(" ")
            for i, word in enumerate(words):
                token_to_send = word + (" " if i < len(words) - 1 else "")
                payload = {
                    "token": token_to_send,
                    "msg_id": bot_msg_id,
                    "handoff": handoff_required
                }
                yield f"data: {json.dumps(payload)}\n\n"
                await asyncio.sleep(0.03)  # Smooth typing latency
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")


# ==========================================
# 4. Standard Non-Streaming Chat Endpoint
# ==========================================
@router.post("/")
def chat_with_bot(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        bot = db.query(Bot).filter(Bot.id == request.bot_id).first()
        
        if not bot:
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

        if bot.owner:
            if bot.owner.message_count >= bot.owner.message_limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"Free tier message limit reached ({bot.owner.message_count}/{bot.owner.message_limit}). Please upgrade or reset to continue."
                )
            bot.owner.message_count += 1
            db.commit()

        # Generate Grounded RAG Output
        rag_output = generate_rag_response(bot_id=request.bot_id, question=request.question)
        
        if isinstance(rag_output, dict):
            answer_text = rag_output.get("answer", "")
            sources = rag_output.get("sources", [])
            verification_status = rag_output.get("verification_status", "verified")
            confidence_score = rag_output.get("confidence_score", 0.95)
        else:
            answer_text = str(rag_output)
            sources = []
            verification_status = "verified"
            confidence_score = 0.95

        # Persist conversation log to DB safely
        try:
            user_msg = ChatMessage(
                id=f"msg_{uuid.uuid4().hex[:12]}",
                bot_id=bot.id,
                sender="user",
                message=request.question
            )
            bot_msg = ChatMessage(
                id=f"msg_{uuid.uuid4().hex[:12]}",
                bot_id=bot.id,
                sender="bot",
                message=answer_text
            )
            db.add(user_msg)
            db.add(bot_msg)
            db.commit()
        except Exception:
            db.rollback()

        # Return full payload with source citations and verification status
        return {
            "bot_id": bot.id,
            "question": request.question,
            "answer": answer_text,
            "sources": sources,
            "verification_status": verification_status,
            "confidence_score": confidence_score
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")


# ==========================================
# 5. History Retrieval
# ==========================================
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
                "feedback": getattr(msg, "feedback", None),
                "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M:%S") if msg.created_at else ""
            }
            for msg in messages
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat logs: {str(e)}")