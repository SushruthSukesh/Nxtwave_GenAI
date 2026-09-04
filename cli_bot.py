"""
VoxGenAI - Terminal Voice FAQ Assistant
Interact with the NxtWave GenAI knowledge base via microphone and offline speech synthesis.
"""

import sys
import os
import json
import re

DATA_FILE = os.path.join(os.path.dirname(__file__), "faq_data.json")

def load_faqs():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def init_tts():
    try:
        import pyttsx3
        engine = pyttsx3.init()
        engine.setProperty("rate", 175)
        return engine
    except Exception as e:
        print(f"[Warning] pyttsx3 speech synthesis unavailable: {e}")
        return None

def speak_text(engine, text):
    print(f"\n🤖 VoxGenAI: {text}\n")
    if engine:
        try:
            engine.say(text)
            engine.runAndWait()
        except Exception as e:
            print(f"[Speech Error]: {e}")

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

def find_match(query, faqs):
    scored = []
    for faq in faqs:
        s = score_query(query, faq)
        if s > 0:
            scored.append((s, faq))
    scored.sort(key=lambda x: x[0], reverse=True)
    if scored and scored[0][0] >= 18.0:
        return scored[0][1]
    return None

def listen_mic():
    try:
        import speech_recognition as sr
        r = sr.Recognizer()
        with sr.Microphone() as source:
            print("\n🎙️ Listening... (Speak now)")
            r.adjust_for_ambient_noise(source, duration=0.8)
            audio = r.listen(source, timeout=6, phrase_time_limit=10)
            print("⏳ Processing speech...")
            query = r.recognize_google(audio)
            print(f"👤 You (Voice): {query}")
            return query
    except Exception as e:
        print(f"[Mic input error or timeout]: {e}")
        return None

def main():
    print("=" * 60)
    print("       VOXGENAI — TERMINAL VOICE FAQ BOT (NxtWave GenAI)      ")
    print("=" * 60)
    faqs = load_faqs()
    print(f"Loaded {len(faqs)} FAQ knowledge entries.")
    
    tts_engine = init_tts()
    
    welcome = "Welcome to VoxGenAI terminal assistant. How can I assist you today?"
    speak_text(tts_engine, welcome)

    while True:
        print("\nOptions:")
        print(" [1] Speak via Microphone (Voice Mode)")
        print(" [2] Type Question in Terminal")
        print(" [3] List all FAQ Questions")
        print(" [4] Exit")

        choice = input("\nEnter choice [1-4] (default 1): ").strip() or "1"

        if choice == "4" or choice.lower() in ["exit", "quit"]:
            speak_text(tts_engine, "Goodbye! Keep building with GenAI!")
            break
        elif choice == "3":
            print("\n--- Available Knowledge Base Questions ---")
            for idx, faq in enumerate(faqs, 1):
                print(f"{idx}. [{faq['category']}] {faq['question']}")
            continue
        elif choice == "1":
            query = listen_mic()
            if not query:
                print("Could not capture speech. Switching to text input for this turn.")
                query = input("Type your question: ").strip()
        else:
            query = input("\n👤 Your question: ").strip()

        if not query:
            continue

        match = find_match(query, faqs)
        if match:
            speak_text(tts_engine, match["answer"])
        else:
            fallback = "I couldn't find a direct match in the knowledge base. Please try asking about RAG, LLM Prompt Engineering, Vector DBs, or NxtWave programs."
            speak_text(tts_engine, fallback)

if __name__ == "__main__":
    main()
