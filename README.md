# 🎙️ VoxGenAI — Intelligent Voice FAQ Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![NxtWave GenAI](https://img.shields.io/badge/NxtWave-GenAI%20Project-indigo.svg)](#)
[![Speech-to-Text](https://img.shields.io/badge/STT-Web%20Speech%20API-emerald.svg)](#)
[![Text-to-Speech](https://img.shields.io/badge/TTS-Speech%20Synthesis-cyan.svg)](#)
[![FastAPI Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python-009688.svg)](#)

> An interactive, voice-driven FAQ and knowledge base assistant built for the **NxtWave GenAI** curriculum. Features real-time Speech-to-Text (STT), natural Text-to-Speech (TTS), glowing audio visualizers, intelligent fuzzy/semantic search, and a customizable knowledge base.

---

## ✨ Features

- 🎙️ **Real-Time Voice Input (STT)**: Speak queries directly using microphone integration with live interim transcription.
- 🔊 **Natural Voice Responses (TTS)**: Instant voice synthesis with customizable speech speed, pitch, and voice selection.
- 🌊 **Dynamic Audio Visualizer**: Pulsing sinusoidal wave and glowing reactive AI orb responding dynamically to speech input and audio playback.
- 🧠 **Intelligent FAQ Matcher**: Multi-stage NLP matching engine supporting exact matching, keyword indexing, token overlap (Jaccard similarity), and confidence percentage scoring.
- 📚 **Categorized Knowledge Base**: Pre-loaded with comprehensive FAQs covering:
  - Generative AI & Foundation Models
  - Retrieval-Augmented Generation (RAG) & Vector Databases
  - Prompt Engineering & Fine-Tuning
  - NxtWave CCBP 4.0 Programs & Curriculum
  - AI Engineering Career Roadmap & Interview Preparation
- ⚡ **Voice Navigation Commands**: Control the bot hands-free by speaking commands like *"Clear chat"*, *"Mute"*, *"Unmute"*, *"Open FAQs"*, or *"Help"*.
- 🛠️ **Custom Knowledge Base Editor**: Add, edit, and persist custom question-answer pairs directly via the UI with `localStorage` synchronization.
- 📑 **Export Transcripts**: Export complete conversation logs to Markdown with timestamps and confidence scores.
- 🐍 **Fullstack Options**: Zero-dependency static web client + FastAPI REST API backend + standalone Python CLI terminal companion.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    User([👤 User / Voice Input]) -->|Speech Audio| STT[🎙️ Web Speech STT / Mic]
    STT -->|Transcribed Text| Matcher[🧠 Semantic & Keyword Matcher]
    
    subgraph Knowledge Base
        DefaultDB[(📦 Default FAQs)]
        CustomDB[(💾 LocalStorage / Custom FAQs)]
        DefaultDB <--> CustomDB
    end
    
    Knowledge Base -->|Candidate FAQs| Matcher
    Matcher -->|Ranked Best Match + Confidence| Engine[⚙️ Response Engine]
    Engine -->|Spoken Response| TTS[🔊 Web Speech TTS / Pyttsx3]
    Engine -->|Message & Related Cards| UI[💻 Glassmorphism UI & Visualizer]
    TTS --> User
```

---

## 📁 Project Structure

```
Nxtwave_GenAI/
├── index.html          # Modern glassmorphism web interface
├── styles.css          # Cyber-dark theme, visualizer styles & animations
├── app.js              # Core frontend engine (STT, TTS, NLP matching, UI)
├── faq-data.js         # JavaScript FAQ knowledge base dataset
├── faq_data.json       # JSON formatted FAQ dataset
├── server.py           # Optional FastAPI server with REST endpoints
├── cli_bot.py          # Standalone terminal voice FAQ companion
├── requirements.txt    # Python dependencies
├── package.json        # Node metadata and start scripts
├── LICENSE             # MIT License
├── .gitignore          # Git ignore specifications
└── README.md           # Documentation
```

---

## 🚀 Quick Start Guide

### Option 1: Instant Browser Launch (Zero-Config)
You can directly open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Brave, Safari):
1. Double-click `index.html` or open it in your browser.
2. Allow microphone access when prompted.
3. Click the **Microphone** button (or press `Spacebar`) and start asking questions!

---

### Option 2: Run with Node / Live Server
```bash
# Using npx serve (no installation required)
npx serve . -l 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option 3: Run with FastAPI Python Backend
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start the API server
python server.py
```
Open [http://localhost:8000](http://localhost:8000) in your browser. Interactive API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### Option 4: Terminal Voice Bot (CLI Mode)
```bash
python cli_bot.py
```
Choose `[1]` to speak through your microphone or `[2]` to type questions directly in your terminal.

---

## 🗣️ Voice Commands Cheat Sheet

Speak any of the following trigger phrases during active listening:

| Voice Command | Action |
| :--- | :--- |
| `"Help"` / `"What can you do"` | Shows guidance and recommended sample questions |
| `"Clear chat"` / `"Reset"` | Clears the conversation history |
| `"Mute"` / `"Stop voice"` | Mutes text-to-speech audio playback |
| `"Unmute"` / `"Enable voice"` | Enables voice speech responses |
| `"Open FAQs"` / `"Show knowledge base"` | Opens the side knowledge drawer |

---

## 📡 REST API Endpoints

When running `server.py`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/faqs?category=all` | Retrieve all or categorized FAQ entries |
| `POST` | `/api/ask` | Send `{ "query": "string", "category": "all" }` and receive matched answer with confidence percentage and related topics |

---

## 🛠️ Adding Custom FAQs

1. Click the **FAQs** button in the top navigation bar to open the Knowledge Base drawer.
2. Click **+ Add FAQ**.
3. Enter category, question, answer, and comma-separated keywords.
4. Click **Save to Knowledge Base** — your custom FAQ will be immediately searchable and queryable by voice!

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — see the LICENSE file for details.

Developed with ❤️ for the **NxtWave GenAI Community**.
