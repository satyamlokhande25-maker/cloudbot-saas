import json
import requests
from app.core.config import settings
from app.db.vector_store import get_vector_store

def _get_active_gemini_models(api_key: str) -> list:
    """Fetches active generateContent models dynamically."""
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
        "system_instruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [
            {"role": "user", "parts": [{"text": user_content}]}
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1500
        }
    }

    alt_payload = {
        "contents": [{
            "parts": [{"text": f"{system_instruction}\n\n{user_content}"}]
        }],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1500}
    }

    last_error = ""

    for model_name in models_to_try:
        clean_model = model_name if model_name.startswith("models/") else f"models/{model_name}"
        
        for api_version in ["v1beta", "v1"]:
            url = f"https://generativelanguage.googleapis.com/{api_version}/{clean_model}:generateContent?key={api_key}"
            
            try:
                resp = requests.post(url, headers=headers, json=payload_system, timeout=25)
                if resp.status_code != 200:
                    resp = requests.post(url, headers=headers, json=alt_payload, timeout=25)

                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and parts[0].get("text"):
                            answer_text = parts[0].get("text", "").strip()
                            if "Constraint Checklist" in answer_text:
                                answer_text = answer_text.split("Constraint Checklist")[0].strip()
                            if answer_text:
                                return answer_text
                else:
                    last_error = f"{clean_model} ({api_version}): {resp.text}"
            except Exception as e:
                last_error = str(e)
                continue

    return f"Unable to fetch response from AI model. Details: {last_error}"

def generate_rag_response(bot_id: str, question: str) -> str:
    """Retrieves top relevant context and generates a thorough, accurate answer."""
    try:
        vector_store = get_vector_store(bot_id)
        # Retrieves top 8 chunks to cover deep sections
        retriever = vector_store.as_retriever(search_kwargs={"k": 8})
        docs = retriever.invoke(question)

        context = "\n\n---\n\n".join([doc.page_content for doc in docs]) if docs else ""

        system_instruction = (
            "You are CloudBot, an intelligent and helpful AI assistant. "
            "Your objective is to answer the user's question accurately and comprehensively using the provided context.\n\n"
            "Guidelines:\n"
            "1. Synthesize facts, definitions, and explanations directly from the context.\n"
            "2. Present the answer clearly with descriptive paragraphs and clean bullet points (-).\n"
            "3. Do NOT include meta-commentary, prompt rules, or reasoning steps.\n"
            "4. Only if the provided context contains zero relevant facts about the topic, state: "
            "'I do not have enough information from the provided content.'"
        )

        user_content = (
            f"### CONTEXT INFORMATION:\n{context}\n\n"
            f"### USER QUESTION:\n{question}\n\n"
            f"### FINAL ANSWER (Clear, grounded, and structured):"
        )

        response = _call_gemini_api(system_instruction, user_content)
        if response and response.strip():
            return response.strip()

        return "I do not have enough information from the provided content."

    except Exception as e:
        return f"Chat processing error: {str(e)}"