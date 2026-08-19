import os
import re
import json
import requests
from app.core.config import settings
from app.db.vector_store import get_vector_store

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

def generate_rag_response(bot_id: str, question: str) -> str:
    """Universal RAG pipeline supporting websites, videos, documents, and general inquiries."""
    try:
        vector_store = get_vector_store(bot_id)
        
        # k=6 provides balanced context coverage across all formats
        docs = []
        try:
            retriever = vector_store.as_retriever(search_kwargs={"k": 6})
            docs = retriever.invoke(question)
        except Exception:
            docs = []

        context = "\n\n---\n\n".join([doc.page_content for doc in docs]) if docs else ""

        # 100% Universal, Domain-Agnostic System Prompt
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
        if response and response.strip():
            return response.strip()

        return "I do not have enough information from the provided content."

    except Exception as e:
        return f"Chat processing error: {str(e)}"