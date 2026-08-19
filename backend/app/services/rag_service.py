import json
import re
import requests
from app.core.config import settings
from app.db.vector_store import get_vector_store

def _clean_response_formatting(text: str) -> str:
    """Removes markdown asterisks and robotic prefixes for clean GPT-style output."""
    if not text:
        return ""
    
    # 1. Remove bold/italic asterisks (**, *)
    cleaned = re.sub(r'\*{1,3}', '', text)

    # 2. Strip internal checklist leakage if any
    if "Constraint Checklist" in cleaned:
        cleaned = cleaned.split("Constraint Checklist")[0].strip()

    # 3. Remove robotic starting phrases
    prefixes_to_strip = [
        "Based on the provided context,",
        "Based on the context,",
        "According to the provided context,",
        "According to the text,",
        "Based on the medical report provided in the context,",
        "Based on the medical report,"
    ]
    for prefix in prefixes_to_strip:
        if cleaned.lower().startswith(prefix.lower()):
            cleaned = cleaned[len(prefix):].strip()

    return cleaned.strip()

def _call_gemini_api(system_instruction: str, user_content: str) -> str:
    api_key = str(getattr(settings, "GOOGLE_API_KEY", "")).strip()
    if not api_key:
        return "Backend Error: GOOGLE_API_KEY is not configured on the backend server."

    # Direct fast-tier models for instant response without extra listing latency
    models_to_try = [
        "models/gemini-1.5-flash",
        "models/gemini-2.0-flash",
        "models/gemini-1.5-flash-latest",
        "models/gemini-1.5-pro"
    ]

    headers = {"Content-Type": "application/json"}

    payload_system = {
        "system_instruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [
            {"role": "user", "parts": [{"text": user_content}]}
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 800
        }
    }

    alt_payload = {
        "contents": [{
            "parts": [{"text": f"{system_instruction}\n\n{user_content}"}]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 800
        }
    }

    last_error = ""
    for clean_model in models_to_try:
        for api_version in ["v1beta", "v1"]:
            url = f"https://generativelanguage.googleapis.com/{api_version}/{clean_model}:generateContent?key={api_key}"
            try:
                resp = requests.post(url, headers=headers, json=payload_system, timeout=8)
                if resp.status_code != 200:
                    resp = requests.post(url, headers=headers, json=alt_payload, timeout=8)

                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and parts[0].get("text"):
                            raw_answer = parts[0].get("text", "").strip()
                            return _clean_response_formatting(raw_answer)
                else:
                    last_error = f"{clean_model} ({api_version}): {resp.text}"
            except Exception as e:
                last_error = str(e)
                continue

    return f"Unable to fetch response from AI model. Details: {last_error}"

def generate_rag_response(bot_id: str, question: str) -> str:
    """Retrieves relevant context and produces a fast, direct, clean answer."""
    try:
        vector_store = get_vector_store(bot_id)
        
        # k=4 provides optimal context density for speed and precision
        try:
            retriever = vector_store.as_retriever(search_kwargs={"k": 4})
            docs = retriever.invoke(question)
        except Exception:
            docs = []

        context = "\n\n".join([doc.page_content for doc in docs]) if docs else ""

        system_instruction = (
            "You are CloudBot, an intelligent and highly capable AI assistant that responds like ChatGPT.\n\n"
            "Style and Output Guidelines:\n"
            "1. Be direct, natural, professional, and clear.\n"
            "2. Do NOT use markdown bold stars (do not use '**' or '*'). Write plain, clean text.\n"
            "3. Do NOT start answers with robotic phrases such as 'Based on the context' or 'According to the text'. Get straight to the point.\n"
            "4. If formatting lists, use simple bullet points starting with a dash (-).\n"
            "5. If relevant information is found in the context, answer accurately using it.\n"
            "6. For general, conversational, or conceptual queries, respond helpfully and comprehensively.\n"
            "7. If specific private records are required but not present in the context, state: 'I do not have enough information from the provided content.'"
        )

        user_content = (
            f"Context Information:\n{context if context.strip() else 'No specific document context provided.'}\n\n"
            f"User Question: {question}\n\n"
            f"Direct Answer:"
        )

        response = _call_gemini_api(system_instruction, user_content)
        if response and response.strip():
            return response.strip()

        return "I do not have enough information from the provided content."

    except Exception as e:
        return f"Chat processing error: {str(e)}"