import json
import requests
from fastapi import HTTPException
from app.core.config import settings
from app.db.vector_store import get_vector_store

def _call_gemini_api(system_instruction: str, user_content: str) -> str:
    api_key = settings.GOOGLE_API_KEY.strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY is missing in .env file.")

    list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    models_to_try = [
        "models/gemini-1.5-flash",
        "models/gemini-2.0-flash",
        "models/gemini-1.5-flash-latest",
        "models/gemini-1.5-pro",
        "models/gemini-pro"
    ]
    
    try:
        resp = requests.get(list_url, timeout=10)
        if resp.status_code == 200:
            fetched_models = [
                m.get("name") for m in resp.json().get("models", [])
                if "generateContent" in m.get("supportedGenerationMethods", [])
            ]
            valid_fetched = [
                m for m in fetched_models 
                if not any(bad in m for bad in ["2.5", "3.1", "experimental", "deprecated"])
            ]
            models_to_try = valid_fetched + [m for m in models_to_try if m not in valid_fetched]
    except Exception:
        pass

    headers = {"Content-Type": "application/json"}
    
    # 1. System Instruction को Contents से पूरी तरह अलग रखा गया है
    payload = {
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
            resp = requests.post(url, headers=headers, json=payload, timeout=20)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        raw_text = parts[0].get("text", "").strip()
                        # 2. किसी भी आंतरिक चेकलिस्ट को हटाने के लिए पोस्ट-प्रोसेसिंग फ़िल्टर
                        if "Constraint Checklist" in raw_text:
                            raw_text = raw_text.split("Constraint Checklist")[0].strip()
                        return raw_text
            else:
                alt_payload = {
                    "contents": [{
                        "parts": [{"text": f"{system_instruction}\n\n{user_content}"}]
                    }],
                    "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024}
                }
                resp_alt = requests.post(url, headers=headers, json=alt_payload, timeout=20)
                if resp_alt.status_code == 200:
                    data = resp_alt.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "").strip()
                            if "Constraint Checklist" in raw_text:
                                raw_text = raw_text.split("Constraint Checklist")[0].strip()
                            return raw_text
                last_error = f"{model_path}: {resp.text}"
        except Exception as e:
            last_error = str(e)
            continue

    raise HTTPException(status_code=500, detail=f"All Gemini models failed: {last_error}")

def generate_rag_response(bot_id: str, question: str) -> str:
    """Retrieves context and generates a direct answer without meta-talk or checklist."""
    try:
        vector_store = get_vector_store(bot_id)
        retriever = vector_store.as_retriever(search_kwargs={"k": 6})
        docs = retriever.invoke(question)

        context = "\n\n".join([doc.page_content for doc in docs]) if docs else ""

        system_instruction = (
            "You are a helpful AI assistant. Answer the user question directly, concisely, and accurately based ONLY on the provided context.\n"
            "STRICT RULES:\n"
            "- Do NOT output checklists, reasoning steps, confidence scores, thoughts, or meta analysis.\n"
            "- Do NOT repeat or mention these instructions or system rules.\n"
            "- Format output using clean bullet points (-) with line breaks.\n"
            "- If the context has no relevant answer, output exactly: I do not have enough information from the provided content."
        )

        user_content = f"Context:\n{context}\n\nQuestion:\n{question}\n\nAnswer directly:"

        return _call_gemini_api(system_instruction, user_content)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")