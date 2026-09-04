"""
VoxGenAI - Backend API Server
FastAPI server providing FAQ semantic matching endpoints and serving static web assets.
"""

import os
import json
import re
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="VoxGenAI - Voice FAQ Bot API",
    description="Intelligent Voice FAQ Bot API for NxtWave GenAI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = os.path.join(os.path.dirname(__file__), "faq_data.json")

def load_faqs():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

class QueryRequest(BaseModel):
    query: str
    category: Optional[str] = "all"

class FAQItem(BaseModel):
    id: str
    category: str
    question: str
    answer: str
    keywords: List[str]

class MatchResponse(BaseModel):
    matched: bool
    answer: str
    confidence: int
    matched_faq: Optional[dict] = None
    related_faqs: List[dict] = []

def score_query(query: str, faq: dict) -> float:
    clean_query = re.sub(r'[^\w\s]', '', query.lower()).strip()
    clean_question = re.sub(r'[^\w\s]', '', faq.get("question", "").lower()).strip()
    query_tokens = set(clean_query.split())
    question_tokens = set(clean_question.split())

    if not query_tokens:
        return 0.0

    score = 0.0
    if clean_query == clean_question:
        score += 100.0
    elif clean_query in clean_question or clean_question in clean_query:
        score += 45.0

    for kw in faq.get("keywords", []):
        clean_kw = kw.lower()
        if clean_kw in clean_query:
            score += 35.0
        for token in query_tokens:
            if len(token) > 2 and token in clean_kw:
                score += 15.0

    intersection = query_tokens.intersection(question_tokens)
    union = query_tokens.union(question_tokens)
    if union:
        score += (len(intersection) / len(union)) * 50.0

    return score

@app.get("/api/faqs", response_model=List[dict])
def get_all_faqs(category: Optional[str] = None):
    faqs = load_faqs()
    if category and category != "all":
        faqs = [f for f in faqs if f.get("category") == category]
    return faqs

@app.post("/api/ask", response_model=MatchResponse)
def ask_faq(req: QueryRequest):
    faqs = load_faqs()
    if req.category and req.category != "all":
        faqs = [f for f in faqs if f.get("category") == req.category]

    scored = []
    for faq in faqs:
        s = score_query(req.query, faq)
        if s > 0:
            scored.append((s, faq))

    scored.sort(key=lambda x: x[0], reverse=True)

    if scored and scored[0][0] >= 18.0:
        best_score, best_faq = scored[0]
        confidence = min(int((best_score / 60.0) * 100), 99)
        related = [item[1] for item in scored[1:4]]
        return MatchResponse(
            matched=True,
            answer=best_faq["answer"],
            confidence=confidence,
            matched_faq=best_faq,
            related_faqs=related
        )
    else:
        return MatchResponse(
            matched=False,
            answer="I couldn't find an exact match in the knowledge base. Please try asking about RAG, LLM Prompt Engineering, NxtWave curriculum, or explore the FAQ library.",
            confidence=20,
            matched_faq=None,
            related_faqs=faqs[:3]
        )

# Mount current directory to serve web client if index.html is present
static_dir = os.path.dirname(__file__)
if os.path.exists(os.path.join(static_dir, "index.html")):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    print("Starting VoxGenAI server at http://localhost:8000")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
