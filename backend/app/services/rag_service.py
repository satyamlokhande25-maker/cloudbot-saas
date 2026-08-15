import requests
from app.core.config import settings
from app.db.vector_store import get_vector_store

def _call_gemini_api(system_instruction: str, user_content: str) -> str:
    api_key = str(getattr(settings, "GOOGLE_API_KEY", "")).strip()
    if not api_key:
        return "Backend Error: GOOGLE_API_KEY is not configured on the backend server."

    # केवल नए और 100% सपोर्टेड मॉडल्स की लिस्ट
    models_to_try = [
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro"
    ]

    headers = {"Content-Type": "application/json"}
    
    # 1. Payload with system instruction
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

    for model_name in models_to_try:
        # models/ prefix जोड़ना सुनिश्चित करें
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        
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
                # 2. Fallback payload (बिना system_instruction फ़ील्ड के डायरेक्ट प्रॉम्प्ट)
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
                last_error = f"{model_name}: {resp.text}"
        except Exception as e:
            last_error = str(e)
            continue

    return f"Unable to fetch response from AI model. Details: {last_error}"

def generate_rag_response(bot_id: str, question: str) -> str:
    """Retrieves context from vector store and generates an answer."""
    try:
        vector_store = get_vector_store(bot_id)
        retriever = vector_store.as_retriever(search_kwargs={"k": 6})
        docs = retriever.invoke(question)

        context = "\n\n".join([doc.page_content for doc in docs]) if docs else ""

        system_instruction = (
            "You are CloudBot, a helpful AI customer assistant. "
            "Answer the user's question clearly, directly, and accurately using information from the context. "
            "Do NOT include meta-talk, reasoning steps, or internal rules. Format points cleanly with bullet points (-). "
            "If the answer cannot be found in the context, reply with: 'I do not have enough information from the provided content.'"
        )

        user_content = f"Context:\n{context}\n\nUser Question:\n{question}\n\nAnswer directly:"

        response = _call_gemini_api(system_instruction, user_content)
        if response and response.strip():
            return response.strip()

        return "I do not have enough information from the provided content."

    except Exception as e:
        return f"Chat processing error: {str(e)}"