import os
import httpx
from fastapi import APIRouter, HTTPException, Request, Response, Query
from app.services.rag_service import generate_rag_response

router = APIRouter(prefix="/integrations", tags=["Integrations"])

VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "cloudbot_secret_token_2026")

# 1. WHATSAPP WEBHOOK VERIFICATION (Meta GET Handshake)
@router.get("/whatsapp/{bot_id}")
async def verify_whatsapp_webhook(
    bot_id: str,
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification token mismatch")

# 2. WHATSAPP & MESSENGER INCOMING MESSAGES (Meta POST Handler)
@router.post("/whatsapp/{bot_id}")
async def handle_whatsapp_message(bot_id: str, request: Request):
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
        if not messages:
            return {"status": "ignored"}

        message_obj = messages[0]
        from_number = message_obj.get("from")
        msg_body = message_obj.get("text", {}).get("body", "").strip()

        if not from_number or not msg_body:
            return {"status": "ignored"}

        # RAG Search
        ai_reply = generate_rag_response(bot_id=bot_id, question=msg_body)

        phone_number_id = value.get("metadata", {}).get("phone_number_id")
        whatsapp_access_token = request.query_params.get("token") or os.getenv("WHATSAPP_ACCESS_TOKEN")

        if phone_number_id and whatsapp_access_token:
            meta_api_url = f"https://graph.facebook.com/v20.0/{phone_number_id}/messages"
            payload = {
                "messaging_product": "whatsapp",
                "to": from_number,
                "type": "text",
                "text": {"body": ai_reply}
            }
            headers = {
                "Authorization": f"Bearer {whatsapp_access_token}",
                "Content-Type": "application/json"
            }
            async with httpx.AsyncClient() as client:
                await client.post(meta_api_url, headers=headers, json=payload, timeout=20)

        return {"status": "success", "reply": ai_reply}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# 3. TELEGRAM BOT WEBHOOK (100% Free)
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

        answer = generate_rag_response(bot_id=bot_id, question=user_text)

        if telegram_token:
            tg_url = f"https://api.telegram.org/bot{telegram_token}/sendMessage"
            async with httpx.AsyncClient() as client:
                await client.post(tg_url, json={"chat_id": chat_id, "text": answer})

        return {"status": "success", "reply": answer}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# 4. SLACK EVENT SUBSCRIPTIONS (100% Free)
@router.post("/slack/{bot_id}")
async def slack_webhook(bot_id: str, request: Request):
    try:
        data = await request.json()
        if data.get("type") == "url_verification":
            return {"challenge": data.get("challenge")}

        event = data.get("event", {})
        user_text = event.get("text", "").strip()
        channel_id = event.get("channel")
        slack_token = request.query_params.get("token")

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

# 5. DISCORD BOT WEBHOOK (100% Free)
@router.post("/discord/{bot_id}")
async def discord_webhook(bot_id: str, request: Request):
    try:
        data = await request.json()
        user_text = data.get("content", "").strip()
        channel_id = data.get("channel_id")
        discord_token = request.query_params.get("token")

        if not user_text or data.get("author", {}).get("bot"):
            return {"status": "ignored"}

        answer = generate_rag_response(bot_id=bot_id, question=user_text)

        if discord_token and channel_id:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://discord.com/api/v10/channels/{channel_id}/messages",
                    headers={"Authorization": f"Bot {discord_token}"},
                    json={"content": answer}
                )

        return {"status": "success", "reply": answer}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# 6. TWILIO SMS / WHATSAPP WEBHOOK (Free Sandbox)
@router.post("/twilio/{bot_id}")
async def twilio_webhook(bot_id: str, request: Request):
    try:
        form = await request.form()
        user_text = form.get("Body", "").strip()
        from_number = form.get("From")

        if not user_text or not from_number:
            return {"status": "ignored"}

        answer = generate_rag_response(bot_id=bot_id, question=user_text)
        twiml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{answer}</Message>
</Response>"""
        return Response(content=twiml_response, media_type="application/xml")
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# 7. GENERIC REST API (Zapier / Make / CRM / Shopify / Custom Webhook)
@router.post("/webhook/{bot_id}")
async def custom_webhook(bot_id: str, request: Request):
    try:
        data = await request.json()
        question = data.get("question") or data.get("message") or data.get("text", "")
        if not question.strip():
            raise HTTPException(status_code=400, detail="Missing 'question' parameter")

        answer = generate_rag_response(bot_id=bot_id, question=question.strip())
        return {
            "status": "success",
            "bot_id": bot_id,
            "question": question,
            "answer": answer
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))