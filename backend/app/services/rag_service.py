import json
import requests
from app.core.config import settings
from app.db.vector_store import get_vector_store

def _call_gemini_api(system_instruction: str, user_content: str) -> str:
    api_key = getattr(settings, "GOOGLE_API_KEY", "").strip()
    if not api_key:
        return "Backend Error: GOOGLE_API_KEY is missing or not configured on the server."

    # Priority models list
    models_to_try = [
        "models/gemini-1.5-flash",
        "models/gemini-2.0-flash",
        "models/gemini-1.5-flash-latest",
        "models/gemini-1.5-pro",
        "models/gemini-pro"
    ]

    headers = {"Content-Type": "application/json"}
    
    # 1. Payload with clean system instruction
    payload_system = {
        "system_instruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [
            {"role": "user", "parts": [{"text": user_content}]}
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1024
        }
    }

    last_error = ""

    for model_path in models_to_try:
        clean_path = model_path if model_path.startswith("models/") else f"models/{model_path}"
        url = f"https://generativelanguage.googleapis.com/v1beta/{clean_path}:generateContent?key={api_key}"
        
        try:
            resp = requests.post(url, headers=headers, json=payload_system, timeout=25)
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
                # 2. Fallback payload for models that don't support system_instruction field
                alt_payload = {
                    "contents": [{
                        "parts": [{"text": f"{system_instruction}\n\n{user_content}"}]
                    }],
                    "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024}
                }
                resp_alt = requests.post(url, headers=headers, json=alt_payload, timeout=25)
                if resp_alt.status_code == 200:
                    data = resp_alt.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and parts[0].get("text"):
                            answer_text = parts[0].get("text", "").strip()
                            if "Constraint Checklist" in answer_text:
                                answer_text = answer_text.split("Constraint Checklist")[0].strip()
                            if answer_text:
                                return answer_text
                last_error = f"{model_path}: {resp.text}"
        except Exception as e:
            last_error = str(e)
            continue

    return f"Unable to fetch response from AI model. Details: {last_error}"

def generate_rag_response(bot_id: str, question: str) -> str:
    """Retrieves context from vector store and returns a clear, grounded answer."""
    try:
        vector_store = get_vector_store(bot_id)
        retriever = vector_store.as_retriever(search_kwargs={"k": 6})
        docs = retriever.invoke(question)

        context = "\n\n".join([doc.page_content for doc in docs]) if docs else ""

        system_instruction = (
            "You are CloudBot, an intelligent and helpful AI customer assistant. "
            "Answer the user's question clearly, directly, and comprehensively based ONLY on the provided context. "
            "Do NOT include meta-talk, reasoning steps, internal rules, or checklists. "
            "Format your answer with clean bullet points and clear paragraphs. "
            "If the context does not contain the answer, reply with: 'I do not have enough information from the provided content.'"
        )

        user_content = f"Context:\n{context}\n\nQuestion:\n{question}\n\nAnswer directly:"

        response = _call_gemini_api(system_instruction, user_content)
        if response and response.strip():
            return response.strip()
            
        return "I do not have enough information from the provided content."

    except Exception as e:
        return f"Chat processing error: {str(e)}"