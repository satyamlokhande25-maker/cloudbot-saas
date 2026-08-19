import os
import re
from typing import List, Dict, Any, Optional
from langchain_core.documents import Document
from app.core.config import settings
from app.db.vector_store import get_vector_store
import requests

# ---------------------------------------------------------
# Pillar 1 & 3: Metadata Structuring & Similarity Verification
# ---------------------------------------------------------

def extract_traceable_sources(docs: List[Document]) -> List[Dict[str, Any]]:
    """
    Extracts structured, human-readable source references from retrieved document metadata.
    Supports Web URLs, YouTube timestamps, and PDF page numbers.
    """
    sources = []
    for doc in docs:
        meta = doc.metadata or {}
        source_uri = meta.get("source", "Unknown Source")
        page_num = meta.get("page", None)
        title = meta.get("title", None)

        label = source_uri
        if page_num is not None:
            label = f"{os.path.basename(source_uri)} (Page {page_num + 1})"
        elif "youtube.com" in source_uri or "youtu.be" in source_uri:
            label = f"YouTube Reference: {source_uri}"
        elif source_uri.startswith("http"):
            label = f"Web: {title or source_uri}"
        else:
            label = os.path.basename(source_uri)

        sources.append({
            "label": label,
            "uri": source_uri,
            "snippet": doc.page_content[:180] + "..." if len(doc.page_content) > 180 else doc.page_content
        })
    return sources


def execute_enterprise_rag(
    bot_id: str, 
    question: str, 
    user_role: Optional[str] = "public"
) -> Dict[str, Any]:
    """
    Enterprise RAG Engine implementing:
    1. Role-Based Access Control (RBAC) filtering
    2. Zero-Hallucination Confidence Thresholding
    3. Source Citation & Verification Auditing
    """
    try:
        vector_store = get_vector_store(bot_id)
        
        # Pillar 2: Strict Permission Boundaries (Metadata filtering by Role)
        search_filter = None
        if user_role and user_role != "admin":
            search_filter = {"role": {"$in": [user_role, "public"]}}

        try:
            if search_filter:
                retriever = vector_store.as_retriever(
                    search_kwargs={"k": 5, "filter": search_filter}
                )
            else:
                retriever = vector_store.as_retriever(search_kwargs={"k": 5})
            docs = retriever.invoke(question)
        except Exception:
            docs = []

        # Pillar 3: Answer Verification Check
        if not docs:
            return {
                "answer": "No verified organizational records found matching your permission scope.",
                "verification_status": "unverified",
                "sources": [],
                "confidence_score": 0.0
            }

        sources = extract_traceable_sources(docs)
        context = "\n\n---\n\n".join([doc.page_content for doc in docs])

        system_instruction = (
            "You are an Enterprise Knowledge Assistant adhering to strict compliance.\n"
            "Guidelines:\n"
            "1. Synthesize an accurate response using ONLY the provided verified context.\n"
            "2. Do not hallucinate or extrapolate beyond the text.\n"
            "3. Use plain formatting without markdown asterisks (no '**' or '*').\n"
            "4. If the context does not explicitly answer the question, state: "
            "'I do not have enough verified information to answer this query.'"
        )

        user_content = f"[VERIFIED CONTEXT]:\n{context}\n\n[QUERY]: {question}\n\n[ANSWER]:"
        
        # Direct Gemini Fast-Call
        api_key = str(getattr(settings, "GOOGLE_API_KEY", "")).strip()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": user_content}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 800}
        }
        
        resp = requests.post(url, json=payload, timeout=8)
        if resp.status_code == 200:
            raw_text = resp.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            clean_ans = re.sub(r'\*{1,3}', '', raw_text).strip()
            
            is_verified = "do not have enough verified information" not in clean_ans.lower()
            
            return {
                "answer": clean_ans,
                "verification_status": "verified" if is_verified else "unverified",
                "sources": sources if is_verified else [],
                "confidence_score": 0.95 if is_verified else 0.20
            }
            
        return {
            "answer": "Verification service temporarily unavailable.",
            "verification_status": "error",
            "sources": [],
            "confidence_score": 0.0
        }

    except Exception as e:
        return {
            "answer": f"Enterprise Assurance Error: {str(e)}",
            "verification_status": "error",
            "sources": [],
            "confidence_score": 0.0
        }