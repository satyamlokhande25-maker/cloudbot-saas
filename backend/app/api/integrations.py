import httpx
from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.rag_service import generate_rag_response

router = APIRouter(prefix="/integrations", tags=["Integrations"])

# 1. TELEGRAM WEBHOOK (100% Free)
@router.post("/telegram/{bot_id}")
async def telegram_webhook(bot_id: str, request: Request):
    try:
        data = await request.json()
        message = data.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        user_text = message.get("text", "").strip()
        telegram_token = request.query_params.get("token")

        if not chat_id or not user_text:
            return {"status": "ignored"}

        # RAG Search
        answer = generate_rag_response(bot_id=bot_id, question=user_text)

        if telegram_token:
            tg_url = f"https://api.telegram.org/bot{telegram_token}/sendMessage"
            async with httpx.AsyncClient() as client:
                await client.post(tg_url, json={"chat_id": chat_id, "text": answer})

        return {"status": "success", "reply": answer}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# 2. SLACK INTERACTION (100% Free)
@router.post("/slack/{bot_id}")
async def slack_webhook(bot_id: str, request: Request):
    try:
        data = await request.json()
        # Handle Slack URL Verification handshake
        if data.get("type") == "url_verification":
            return {"challenge": data.get("challenge")}

        event = data.get("event", {})
        user_text = event.get("text", "").strip()
        channel_id = event.get("channel")
        slack_token = request.query_params.get("token")

        # Ignore bot's own responses
        if event.get("bot_id") or not user_text:
            return {"status": "ignored"}

        answer = generate_rag_response(bot_id=bot_id, question=user_text)

        if slack_token and channel_id:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://slack.com/api/chat.postMessage",
                    headers={"Authorization": f"Bearer {slack_token}"},
                    json={"channel": channel_id, "text": answer}
                )

        return {"status": "success", "reply": answer}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# 3. GENERIC WEBHOOK (Zapier / Make.com / WordPress REST API - Free)
@router.post("/webhook/{bot_id}")
async def custom_webhook(bot_id: str, request: Request):
    try:
        data = await request.json()
        question = data.get("question") or data.get("message") or data.get("text", "")
        if not question.strip():
            raise HTTPException(status_code=400, detail="Missing 'question' or 'message' parameter")

        answer = generate_rag_response(bot_id=bot_id, question=question.strip())
        return {
            "status": "success",
            "bot_id": bot_id,
            "question": question,
            "answer": answer
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))