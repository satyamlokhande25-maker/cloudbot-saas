import os
import re
import json
import requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.vector_store import get_vector_store
from app.db.database import SessionLocal
from app.db.models import ChatMessage

def _clean_response_formatting(text: str) -> str:
    """Universal output cleaner: removes markdown asterisks and robotic prefixes."""
    if not text:
        return ""
    
    # 1. Clean bold/italic asterisks
    cleaned = re.sub(r'\*{1,3}', '', text)

    # 2. Strip checklist leaks if any
    if "Constraint Checklist" in cleaned:
        cleaned = cleaned.split("Constraint Checklist")[0].strip()

    # 3. Strip all generic boilerplate starting prefixes
    prefixes_to_strip = [
        "Based on the provided context,",
        "Based on the context,",
        "According to the provided context,",
        "According to the text,",
        "According to the document,",
        "According to the video,",
        "Based on the content provided,"
    ]
    for prefix in prefixes_to_strip:
        if cleaned.lower().startswith(prefix.lower()):
            cleaned = cleaned[len(prefix):].strip()

    return cleaned.strip()

def _get_active_gemini_models(api_key: str) -> list:
    """Dynamically fetches active models."""
    list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        resp = requests.get(list_url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            models = [
                m.get("name") for m in data.get("models", [])
                if "generateContent" in m.get("supportedGenerationMethods", [])
            ]
            flash_models = [m for m in models if "flash" in m.lower()]
            other_models = [m for m in models if "flash" not in m.lower()]
            return flash_models + other_models
    except Exception:
        pass
    return ["models/gemini-1.5-flash", "models/gemini-2.0-flash", "models/gemini-1.5-pro"]

def _call_gemini_api(system_instruction: str, user_content: str) -> str:
    api_key = str(getattr(settings, "GOOGLE_API_KEY", "")).strip()
    if not api_key:
        return "Backend Error: GOOGLE_API_KEY is not configured on the backend server."

    models_to_try = _get_active_gemini_models(api_key)
    headers = {"Content-Type": "application/json"}
    
    payload_system = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1000}
    }

    alt_payload = {
        "contents": [{"parts": [{"text": f"{system_instruction}\n\n{user_content}"}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1000}
    }

    last_error = ""
    for model_name in models_to_try:
        clean_model = model_name if model_name.startswith("models/") else f"models/{model_name}"
        for api_version in ["v1beta", "v1"]:
            url = f"https://generativelanguage.googleapis.com/{api_version}/{clean_model}:generateContent?key={api_key}"
            try:
                resp = requests.post(url, headers=headers, json=payload_system, timeout=15)
                if resp.status_code != 200:
                    resp = requests.post(url, headers=headers, json=alt_payload, timeout=15)

                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and parts[0].get("text"):
                            answer_text = parts[0].get("text", "").strip()
                            return _clean_response_formatting(answer_text)
                else:
                    last_error = f"{clean_model} ({api_version}): {resp.text}"
            except Exception as e:
                last_error = str(e)
                continue

    # Fallback to Groq if configured
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key:
        try:
            groq_url = "https://api.groq.com/openai/v1/chat/completions"
            groq_headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            groq_payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_content}
                ],
                "temperature": 0.2,
                "max_tokens": 1000
            }
            groq_resp = requests.post(groq_url, headers=groq_headers, json=groq_payload, timeout=8)
            if groq_resp.status_code == 200:
                content = groq_resp.json()["choices"][0]["message"]["content"]
                return _clean_response_formatting(content)
        except Exception:
            pass

    return f"Unable to fetch response from AI model. Details: {last_error}"

def _search_database_logs_memory(bot_id: str, question: str) -> dict:
    """Fallback: Searches historical conversation logs in PostgreSQL if Vector DB lacks info."""
    db: Session = SessionLocal()
    try:
        logs = (
            db.query(ChatMessage)
            .filter(ChatMessage.bot_id == bot_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(30)
            .all()
        )
        
        if not logs:
            return None

        # Build context from previous verified conversation pairs
        conversation_context = []
        for i in range(len(logs) - 1):
            if logs[i+1].sender == "user" and logs[i].sender == "bot":
                bot_ans = logs[i].message.strip()
                if "do not have enough information" not in bot_ans.lower() and "error" not in bot_ans.lower():
                    conversation_context.append(f"User: {logs[i+1].message}\nBot Answer: {bot_ans}")

        if not conversation_context:
            return None

        history_block = "\n\n---\n\n".join(conversation_context[:10])

        system_instruction = (
            "You are CloudBot assistant with persistent memory.\n\n"
            "Guidelines:\n"
            "1. Answer the user question strictly using the provided [PREVIOUS VERIFIED CONVERSATION LOGS].\n"
            "2. If the answer is found in the logs, synthesize and reply accurately, clearly, and directly.\n"
            "3. Do NOT use markdown asterisks (no '**' or '*'). Format lists using bullet points (-).\n"
            "4. If the question is not present in the logs, reply: 'I do not have enough information from the provided content.'"
        )

        user_content = (
            f"[PREVIOUS VERIFIED CONVERSATION LOGS]:\n{history_block}\n\n"
            f"User Question: {question}\n\n"
            f"Answer:"
        )
        
        answer = _call_gemini_api(system_instruction, user_content)
        
        if answer and "do not have enough information" not in answer.lower() and not answer.startswith("Unable to fetch"):
            return {
                "answer": answer,
                "sources": [{
                    "label": "Saved Conversation Memory",
                    "uri": "database_logs",
                    "snippet": history_block[:160].strip() + "..."
                }],
                "verification_status": "verified",
                "confidence_score": 0.92
            }
    except Exception:
        pass
    finally:
        db.close()
    
    return None

def generate_rag_response(bot_id: str, question: str) -> dict:
    """Universal RAG pipeline returning grounded response along with deduplicated source citations and log memory fallback."""
    try:
        vector_store = get_vector_store(bot_id)
        
        # k=6 provides balanced context coverage across all formats
        docs = []
        try:
            retriever = vector_store.as_retriever(search_kwargs={"k": 6})
            docs = retriever.invoke(question)
        except Exception:
            docs = []

        # 🔹 Deduplication: Ensure duplicate filenames are merged into 1 clean button
        seen_labels = set()
        sources = []
        for doc in docs:
            meta = doc.metadata or {}
            source_uri = meta.get("source", "Trained Document")
            page_num = meta.get("page", None)
            
            label = os.path.basename(source_uri)
            if page_num is not None:
                label = f"{label} (Page {page_num + 1})"
            elif "youtube.com" in source_uri or "youtu.be" in source_uri:
                label = "YouTube Reference"
            elif source_uri.startswith("http"):
                label = f"Web: {source_uri[:35]}..."

            if label not in seen_labels:
                seen_labels.add(label)
                sources.append({
                    "label": label,
                    "uri": source_uri,
                    "snippet": doc.page_content[:160].strip() + "..." if len(doc.page_content) > 160 else doc.page_content.strip()
                })

        context = "\n\n---\n\n".join([doc.page_content for doc in docs]) if docs else ""

        # Universal, Domain-Agnostic System Prompt
        system_instruction = (
            "You are CloudBot, an intelligent, helpful, and highly versatile AI assistant.\n\n"
            "Core Guidelines:\n"
            "1. Primary Knowledge: If the provided [CONTEXT] contains facts relevant to the user query (regardless of whether it came from a website, video transcript, or document), synthesize and answer directly based on it.\n"
            "2. General Inquiries & Small Talk: For general greetings, technical concepts, coding, or common knowledge questions, answer helpfully and accurately using your broad knowledge base.\n"
            "3. Clean Formatting: Provide a clear, natural response without markdown asterisks (never use '**' or '*'). Format lists using simple bullet points (-).\n"
            "4. Direct Tone: Do NOT open answers with robotic introductory phrases like 'Based on the provided context'. Jump straight to the information.\n"
            "5. Missing Proprietary Information: Only if the user specifically asks for unique private/internal data that is entirely absent from the context, state: 'I do not have enough information from the provided content.'"
        )

        user_content = (
            f"[CONTEXT]:\n{context if context.strip() else 'No specific document or website context provided.'}\n\n"
            f"User Question: {question}\n\n"
            f"Answer:"
        )

        response = _call_gemini_api(system_instruction, user_content)
        raw_answer = response.strip() if response and response.strip() else "I do not have enough information from the provided content."
        
        # 🔹 BACKUP TRIGGER: Agar Vector DB me info nahi mili, toh database ke conversation logs me search karo
        if "do not have enough information" in raw_answer.lower() or not docs:
            logs_memory_result = _search_database_logs_memory(bot_id, question)
            if logs_memory_result:
                return logs_memory_result

        is_unverified = "do not have enough information" in raw_answer.lower()

        return {
            "answer": raw_answer,
            "sources": [] if is_unverified else sources,
            "verification_status": "unverified" if is_unverified else "verified",
            "confidence_score": 0.20 if is_unverified else 0.95
        }

    except Exception as e:
        return {
            "answer": f"Chat processing error: {str(e)}",
            "sources": [],
            "verification_status": "unverified",
            "confidence_score": 0.0
        }