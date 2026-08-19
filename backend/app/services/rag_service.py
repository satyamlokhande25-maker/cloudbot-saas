import os
import re
import json
import requests
from app.core.config import settings
from app.db.vector_store import get_vector_store

def _clean_response_formatting(text: str) -> str:
    """Removes markdown asterisks (*, **) and robotic boilerplate prefixes."""
    if not text:
        return ""
    
    # 1. Markdown asterisks strip
    cleaned = re.sub(r'\*{1,3}', '', text)

    # 2. Strip internal checklist/meta-talk
    if "Constraint Checklist" in cleaned:
        cleaned = cleaned.split("Constraint Checklist")[0].strip()

    # 3. Remove robotic boilerplate greetings/prefixes
    prefixes_to_strip = [
        "Based on the provided context,",
        "Based on the context,",
        "According to the provided context,",
        "According to the medical report provided in the context,",
        "According to the medical report,",
        "Based on the medical report provided in the context,",
        "Based on the medical report,"
    ]
    for prefix in prefixes_to_strip:
        if cleaned.lower().startswith(prefix.lower()):
            cleaned = cleaned[len(prefix):].strip()

    return cleaned.strip()

def _call_gemini_api(system_instruction: str, user_content: str) -> str:
    """Primary Provider: Ultra-fast Google Gemini via v1beta REST API."""
    api_key = str(getattr(settings, "GOOGLE_API_KEY", "")).strip()
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not configured")

    models_to_try = [
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-pro"
    ]

    headers = {"Content-Type": "application/json"}
    payload = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 800
        }
    }

    last_error = ""
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and parts[0].get("text"):
                        return _clean_response_formatting(parts[0].get("text"))
            else:
                last_error = resp.text
        except Exception as e:
            last_error = str(e)
            continue

    raise RuntimeError(f"Gemini failed: {last_error}")

def _call_groq_api(system_instruction: str, user_content: str) -> str:
    """Secondary Provider: High-speed Groq Llama-3 failover engine."""
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_key:
        raise ValueError("GROQ_API_KEY not configured")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Content-Type": "application/json"
    }

    models_to_try = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]

    for model in models_to_try:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.2,
            "max_tokens": 800
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=4)
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"]
                return _clean_response_formatting(content)
        except Exception:
            continue

    raise RuntimeError("All Groq models failed")

def generate_rag_response(bot_id: str, question: str) -> str:
    """Multi-Engine RAG Pipeline with zero-downtime automatic failover."""
    try:
        vector_store = get_vector_store(bot_id)
        
        try:
            retriever = vector_store.as_retriever(search_kwargs={"k": 4})
            docs = retriever.invoke(question)
        except Exception:
            docs = []

        context = "\n\n".join([doc.page_content for doc in docs]) if docs else ""

        system_instruction = (
            "You are CloudBot, an intelligent and professional AI assistant.\n\n"
            "Guidelines:\n"
            "1. Answer clearly, accurately, and naturally without asterisks (do not use '*' or '**').\n"
            "2. Never use robotic prefixes like 'Based on the context' or 'According to the report'. State facts directly.\n"
            "3. If relevant information exists in the provided context, answer strictly using it.\n"
            "4. For general or technical questions, answer thoroughly using your knowledge.\n"
            "5. If specific private records are missing from the context, state: 'I do not have enough information from the provided content.'"
        )

        user_content = (
            f"Context:\n{context if context.strip() else 'No specific document context provided.'}\n\n"
            f"Question:\n{question}\n\n"
            f"Direct Answer:"
        )

        # 1. Primary Attempt: Google Gemini Engine
        try:
            return _call_gemini_api(system_instruction, user_content)
        except Exception as gemini_err:
            print(f"[Engine Switch] Gemini failed ({gemini_err}). Triggering Groq Fallback...")

        # 2. Secondary Attempt: Groq Cloud Engine
        try:
            return _call_groq_api(system_instruction, user_content)
        except Exception as groq_err:
            print(f"[Engine Switch] Groq fallback failed ({groq_err}).")

        return "I do not have enough information from the provided content."

    except Exception as e:
        return f"Chat processing error: {str(e)}"