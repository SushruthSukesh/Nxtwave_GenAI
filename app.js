/**
 * VoxGenAI - Core Application Logic
 * Speech Recognition, Voice Synthesis, Intelligent NLP Matcher, Audio Visualizer
 */

class VoiceFAQApp {
  constructor() {
    this.faqs = [];
    this.customFaqs = [];
    this.messages = [];
    this.currentCategory = 'all';

    // Voice & Speech Settings
    this.settings = {
      voiceUri: '',
      rate: 1.0,
      pitch: 1.0,
      autoSpeak: true,
      continuous: false,
      chimes: true
    };

    // State
    this.isListening = false;
    this.isSpeaking = false;
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.availableVoices = [];
    this.currentUtterance = null;

    // Visualizer state
    this.canvas = null;
    this.ctx = null;
    this.animFrameId = null;
    this.wavePhase = 0;

    this.init();
  }

  async init() {
    this.loadSettings();
    this.loadCustomFaqs();
    this.mergeFaqData();
    this.cacheDomElements();
    this.setupVisualizer();
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
    this.bindEvents();
    this.renderFaqDrawerList();
    this.renderWelcomeMessage();
  }

  cacheDomElements() {
    this.dom = {
      statusPill: document.getElementById('status-pill'),
      statusText: document.getElementById('status-text'),
      liveTranscript: document.getElementById('live-transcript'),
      aiOrb: document.getElementById('ai-orb'),
      categoryChips: document.getElementById('category-chips'),
      chatStream: document.getElementById('chat-stream'),
      btnMic: document.getElementById('btn-mic'),
      btnSend: document.getElementById('btn-send'),
      btnStopSpeech: document.getElementById('btn-stop-speech'),
      textInput: document.getElementById('text-input'),
      faqDrawer: document.getElementById('faq-drawer'),
      btnToggleFaq: document.getElementById('btn-toggle-faq'),
      btnCloseFaq: document.getElementById('btn-close-faq'),
      faqSearchInput: document.getElementById('faq-search-input'),
      faqList: document.getElementById('faq-list'),
      faqCountBadge: document.getElementById('faq-count-badge'),
      settingsModal: document.getElementById('settings-modal'),
      btnOpenSettings: document.getElementById('btn-open-settings'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnSaveSettings: document.getElementById('btn-save-settings'),
      btnTestVoice: document.getElementById('btn-test-voice'),
      voiceSelect: document.getElementById('voice-select'),
      speechRate: document.getElementById('speech-rate'),
      speechRateVal: document.getElementById('speech-rate-val'),
      speechPitch: document.getElementById('speech-pitch'),
      speechPitchVal: document.getElementById('speech-pitch-val'),
      autoSpeakToggle: document.getElementById('auto-speak-toggle'),
      continuousSttToggle: document.getElementById('continuous-stt-toggle'),
      soundEffectsToggle: document.getElementById('sound-effects-toggle'),
      customFaqModal: document.getElementById('custom-faq-modal'),
      btnOpenCustomFaq: document.getElementById('btn-open-custom-faq'),
      btnCloseCustomFaq: document.getElementById('btn-close-custom-faq'),
      btnCancelCustomFaq: document.getElementById('btn-cancel-custom-faq'),
      btnSaveCustomFaq: document.getElementById('btn-save-custom-faq'),
      newFaqCat: document.getElementById('new-faq-category'),
      newFaqQ: document.getElementById('new-faq-question'),
      newFaqA: document.getElementById('new-faq-answer'),
      newFaqKw: document.getElementById('new-faq-keywords'),
      btnExportChat: document.getElementById('btn-export-chat'),
      btnClearChat: document.getElementById('btn-clear-chat')
    };
  }

  mergeFaqData() {
    const baseFaqs = typeof DEFAULT_FAQS !== 'undefined' ? DEFAULT_FAQS : [];
    this.faqs = [...baseFaqs, ...this.customFaqs];
  }

  loadSettings() {
    const saved = localStorage.getItem('voxgenai_settings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Error loading settings', e);
      }
    }
  }

  saveSettings() {
    localStorage.setItem('voxgenai_settings', JSON.stringify(this.settings));
  }

  loadCustomFaqs() {
    const saved = localStorage.getItem('voxgenai_custom_faqs');
    if (saved) {
      try {
        this.customFaqs = JSON.parse(saved);
      } catch (e) {
        console.error('Error loading custom FAQs', e);
      }
    }
  }

  saveCustomFaqs() {
    localStorage.setItem('voxgenai_custom_faqs', JSON.stringify(this.customFaqs));
  }

  /* ==========================================================================
     Speech Recognition (STT)
     ========================================================================== */
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this browser.');
      this.dom.btnMic.title = 'Speech Recognition not supported in your browser. Use text input.';
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.settings.continuous;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateStateUI();
      this.playChime(440, 0.1);
      this.dom.liveTranscript.innerHTML = '<span class="transcript-placeholder" style="color: #fb7185">Listening... Speak your question</span>';
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const display = finalTranscript || interimTranscript;
      if (display) {
        this.dom.liveTranscript.textContent = `"${display}"`;
      }

      if (finalTranscript) {
        this.handleUserQuery(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      this.updateStateUI();
      if (event.error === 'not-allowed') {
        alert('Microphone permission was denied. Please allow microphone access in your browser.');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateStateUI();
      if (this.settings.continuous) {
        try {
          this.recognition.start();
        } catch (e) {}
      }
    };
  }

  toggleMicrophone() {
    if (!this.recognition) {
      alert('Speech Recognition is not supported by your browser. Please use Google Chrome, Edge, or Safari.');
      return;
    }

    // Stop speaking if currently speaking
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.error('Recognition start error:', e);
      }
    }
  }

  /* ==========================================================================
     Speech Synthesis (TTS)
     ========================================================================== */
  initSpeechSynthesis() {
    if (!this.synthesis) return;

    const populateVoices = () => {
      this.availableVoices = this.synthesis.getVoices();
      this.dom.voiceSelect.innerHTML = '';

      // Prioritize English voices
      const sortedVoices = [...this.availableVoices].sort((a, b) => {
        const aEng = a.lang.startsWith('en');
        const bEng = b.lang.startsWith('en');
        if (aEng && !bEng) return -1;
        if (!aEng && bEng) return 1;
        return a.name.localeCompare(b.name);
      });

      sortedVoices.forEach((voice) => {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — Default' : ''}`;
        if (voice.voiceURI === this.settings.voiceUri) {
          option.selected = true;
        }
        this.dom.voiceSelect.appendChild(option);
      });

      if (!this.settings.voiceUri && sortedVoices.length > 0) {
        const defaultVoice = sortedVoices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))) || sortedVoices[0];
        if (defaultVoice) {
          this.settings.voiceUri = defaultVoice.voiceURI;
          this.dom.voiceSelect.value = defaultVoice.voiceURI;
        }
      }
    };

    populateVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = populateVoices;
    }
  }

  speak(text) {
    if (!this.synthesis) return;
    this.stopSpeaking();

    // Clean text of markdown/tags for clean spoken audio
    const cleanText = text.replace(/[*_#`\[\]]/g, '').trim();
    if (!cleanText) return;

    this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance.rate = this.settings.rate;
    this.currentUtterance.pitch = this.settings.pitch;

    if (this.settings.voiceUri) {
      const chosenVoice = this.availableVoices.find(v => v.voiceURI === this.settings.voiceUri);
      if (chosenVoice) {
        this.currentUtterance.voice = chosenVoice;
      }
    }

    this.currentUtterance.onstart = () => {
      this.isSpeaking = true;
      this.updateStateUI();
    };

    this.currentUtterance.onend = () => {
      this.isSpeaking = false;
      this.updateStateUI();
    };

    this.currentUtterance.onerror = (e) => {
      console.error('TTS error:', e);
      this.isSpeaking = false;
      this.updateStateUI();
    };

    this.synthesis.speak(this.currentUtterance);
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.updateStateUI();
    }
  }

  /* ==========================================================================
     Intelligent NLP Matching Algorithm
     ========================================================================== */
  findBestFaqMatch(query) {
    if (!query || typeof query !== 'string') return null;
    const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const queryTokens = cleanQuery.split(/\s+/).filter(t => t.length > 1);

    if (queryTokens.length === 0) return null;

    let bestScore = 0;
    let bestMatch = null;
    const scoredFaqs = [];

    // Filter by selected category if not 'all'
    const candidateFaqs = this.currentCategory === 'all'
      ? this.faqs
      : this.faqs.filter(f => f.category === this.currentCategory);

    for (const faq of candidateFaqs) {
      let score = 0;
      const cleanQuestion = faq.question.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const questionTokens = cleanQuestion.split(/\s+/).filter(t => t.length > 1);

      // 1. Exact match bonus
      if (cleanQuery === cleanQuestion) {
        score += 100;
      }

      // 2. Substring inclusion
      if (cleanQuestion.includes(cleanQuery) || cleanQuery.includes(cleanQuestion)) {
        score += 45;
      }

      // 3. Keyword matches
      if (faq.keywords && Array.isArray(faq.keywords)) {
        for (const kw of faq.keywords) {
          const cleanKw = kw.toLowerCase().trim();
          if (cleanQuery.includes(cleanKw)) {
            score += 35;
          }
          for (const token of queryTokens) {
            if (cleanKw.includes(token) && token.length > 2) {
              score += 15;
            }
          }
        }
      }

      // 4. Token overlap (Jaccard similarity)
      const tokenIntersection = queryTokens.filter(t => questionTokens.includes(t));
      const jaccardScore = tokenIntersection.length / Math.max(queryTokens.length, questionTokens.length);
      score += jaccardScore * 50;

      if (score > 0) {
        scoredFaqs.push({ faq, score });
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = faq;
      }
    }

    // Sort descending by score
    scoredFaqs.sort((a, b) => b.score - a.score);

    // Confidence scaling to percentage (0 - 100%)
    const confidence = Math.min(Math.round((bestScore / 60) * 100), 99);

    const related = scoredFaqs.slice(1, 4).map(item => item.faq);

    return {
      match: bestScore >= 18 ? bestMatch : null,
      confidence: bestScore >= 18 ? confidence : 0,
      related: related
    };
  }

  /* ==========================================================================
     Voice Command Router & Query Handler
     ========================================================================== */
  handleUserQuery(queryText) {
    if (!queryText) return;

    // Add user message to timeline
    this.addMessage('user', queryText);

    // Check for direct voice commands
    const lower = queryText.toLowerCase().trim();

    if (lower === 'clear chat' || lower === 'clear history' || lower === 'reset') {
      this.clearChat();
      this.respond('Chat history has been cleared.', 100);
      return;
    }

    if (lower === 'help' || lower === 'voice commands' || lower === 'what can you do') {
      const helpMsg = `Here are some things you can ask me:
- Ask about Generative AI: "What is RAG?", "What is Prompt Engineering?"
- Ask about NxtWave: "Tell me about NxtWave curriculum", "What placement support is available?"
- Ask about AI Engineering: "What skills are needed to become an AI Engineer?", "What is LangChain?"
- Voice commands: Say "Clear chat", "Mute", "Unmute", or "Open FAQs" anytime!`;
      this.respond(helpMsg, 100);
      return;
    }

    if (lower === 'mute' || lower === 'stop voice' || lower === 'disable voice') {
      this.settings.autoSpeak = false;
      this.dom.autoSpeakToggle.checked = false;
      this.saveSettings();
      this.respond('Voice output is now muted. You can say "Unmute" to re-enable voice responses.', 100);
      return;
    }

    if (lower === 'unmute' || lower === 'enable voice') {
      this.settings.autoSpeak = true;
      this.dom.autoSpeakToggle.checked = true;
      this.saveSettings();
      this.respond('Voice output is enabled! I will speak answers aloud.', 100);
      return;
    }

    if (lower === 'open faqs' || lower === 'show knowledge base') {
      this.openFaqDrawer();
      this.respond('Opening the Knowledge Base library.', 100);
      return;
    }

    // Match FAQ
    const result = this.findBestFaqMatch(queryText);

    if (result && result.match) {
      this.respond(result.match.answer, result.confidence, result.match, result.related);
    } else {
      const fallbackAnswer = `I couldn't find an exact answer in the knowledge base for "${queryText}". Try asking about RAG, Generative AI models, NxtWave curriculum, Vector Databases, or click on the FAQs tab to explore pre-loaded questions!`;
      this.respond(fallbackAnswer, 20, null, this.faqs.slice(0, 3));
    }
  }

  respond(text, confidence = 95, matchedFaq = null, related = []) {
    this.addMessage('bot', text, confidence, matchedFaq, related);
    if (this.settings.autoSpeak) {
      this.speak(text);
    }
  }

  /* ==========================================================================
     UI Message Rendering
     ========================================================================== */
  addMessage(sender, text, confidence = 0, matchedFaq = null, related = []) {
    const msgObj = { id: Date.now(), sender, text, confidence, matchedFaq, related, time: new Date() };
    this.messages.push(msgObj);

    const row = document.createElement('div');
    row.className = `message-row ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    if (sender === 'bot') {
      avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line><line x1="8" y1="22" x2="16" y2="22"></line></svg>`;
    } else {
      avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    const textPara = document.createElement('div');
    textPara.className = 'msg-text';
    textPara.innerHTML = this.formatMarkdown(text);
    bubble.appendChild(textPara);

    // Related questions pills
    if (related && related.length > 0 && sender === 'bot') {
      const relContainer = document.createElement('div');
      relContainer.className = 'related-questions';
      const relTitle = document.createElement('span');
      relTitle.className = 'related-title';
      relTitle.textContent = 'Related Questions:';
      relContainer.appendChild(relTitle);

      related.forEach(faq => {
        const btn = document.createElement('button');
        btn.className = 'related-btn';
        btn.textContent = `⚡ ${faq.question}`;
        btn.addEventListener('click', () => {
          this.dom.textInput.value = faq.question;
          this.handleUserQuery(faq.question);
        });
        relContainer.appendChild(btn);
      });
      bubble.appendChild(relContainer);
    }

    // Meta bar
    const meta = document.createElement('div');
    meta.className = 'msg-meta';

    if (sender === 'bot' && confidence > 0) {
      const tag = document.createElement('span');
      tag.className = 'confidence-tag';
      tag.textContent = `${confidence}% Match`;
      meta.appendChild(tag);
    }

    const timeSpan = document.createElement('span');
    timeSpan.textContent = msgObj.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    meta.appendChild(timeSpan);

    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    // Copy action
    const btnCopy = document.createElement('button');
    btnCopy.className = 'btn-msg-action';
    btnCopy.title = 'Copy text';
    btnCopy.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(text);
      btnCopy.style.color = 'var(--accent-emerald)';
      setTimeout(() => { btnCopy.style.color = ''; }, 1500);
    });
    actions.appendChild(btnCopy);

    // Speak action
    if (sender === 'bot') {
      const btnSpeak = document.createElement('button');
      btnSpeak.className = 'btn-msg-action';
      btnSpeak.title = 'Read aloud';
      btnSpeak.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
      btnSpeak.addEventListener('click', () => this.speak(text));
      actions.appendChild(btnSpeak);
    }

    meta.appendChild(actions);
    bubble.appendChild(meta);

    row.appendChild(avatar);
    row.appendChild(bubble);

    this.dom.chatStream.appendChild(row);
    this.dom.chatStream.scrollTop = this.dom.chatStream.scrollHeight;
  }

  renderWelcomeMessage() {
    const welcome = `👋 Hello! I am **VoxGenAI**, your Voice FAQ & AI Knowledge Assistant for **NxtWave GenAI**.

You can click the **Microphone button** below or press **Spacebar** to ask questions with your voice. Try asking:
- *"What is Retrieval-Augmented Generation (RAG)?"*
- *"Tell me about the NxtWave GenAI curriculum"*
- *"What skills are needed to become an AI Engineer?"*`;
    this.addMessage('bot', welcome, 100);
  }

  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  clearChat() {
    this.messages = [];
    this.dom.chatStream.innerHTML = '';
  }

  /* ==========================================================================
     Visualizer Animation Canvas
     ========================================================================== */
  setupVisualizer() {
    this.canvas = document.getElementById('visualizer-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    const render = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const width = this.canvas.width;
      const height = this.canvas.height;
      const centerY = height / 2;

      const isVoiceActive = this.isListening || this.isSpeaking;
      const baseAmp = isVoiceActive ? (this.isListening ? 26 : 34) : 8;
      const waveCount = isVoiceActive ? 4 : 2;

      this.wavePhase += isVoiceActive ? 0.08 : 0.02;

      for (let i = 0; i < waveCount; i++) {
        this.ctx.beginPath();
        this.ctx.lineWidth = i === 0 ? 2.5 : 1.2;

        if (this.isListening) {
          this.ctx.strokeStyle = `rgba(244, 63, 94, ${0.8 - i * 0.2})`;
        } else if (this.isSpeaking) {
          this.ctx.strokeStyle = `rgba(6, 182, 212, ${0.8 - i * 0.2})`;
        } else {
          this.ctx.strokeStyle = `rgba(99, 102, 241, ${0.35 - i * 0.15})`;
        }

        for (let x = 0; x < width; x++) {
          const progress = x / width;
          // Gaussian envelope to taper edges
          const envelope = Math.sin(progress * Math.PI);
          const freq = 0.025 + i * 0.01;
          const y = centerY + Math.sin(x * freq + this.wavePhase + i) * baseAmp * envelope;

          if (x === 0) {
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        }
        this.ctx.stroke();
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }

  /* ==========================================================================
     UI State Updates
     ========================================================================== */
  updateStateUI() {
    this.dom.aiOrb.classList.remove('state-listening', 'state-speaking', 'state-idle');
    this.dom.statusPill.classList.remove('status-listening', 'status-speaking', 'status-ready');

    if (this.isListening) {
      this.dom.aiOrb.classList.add('state-listening');
      this.dom.statusPill.classList.add('status-listening');
      this.dom.statusText.textContent = 'Listening to speech...';
      this.dom.btnMic.classList.add('active');
      this.dom.btnStopSpeech.classList.add('hidden');
    } else if (this.isSpeaking) {
      this.dom.aiOrb.classList.add('state-speaking');
      this.dom.statusPill.classList.add('status-speaking');
      this.dom.statusText.textContent = 'Speaking answer...';
      this.dom.btnMic.classList.remove('active');
      this.dom.btnStopSpeech.classList.remove('hidden');
    } else {
      this.dom.aiOrb.classList.add('state-idle');
      this.dom.statusPill.classList.add('status-ready');
      this.dom.statusText.textContent = 'Ready to listen';
      this.dom.btnMic.classList.remove('active');
      this.dom.btnStopSpeech.classList.add('hidden');
      this.dom.liveTranscript.innerHTML = '<span class="transcript-placeholder">Press the microphone or spacebar to speak a question...</span>';
    }
  }

  playChime(freq = 520, duration = 0.1) {
    if (!this.settings.chimes) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  /* ==========================================================================
     FAQ Knowledge Base Drawer & Filtering
     ========================================================================== */
  renderFaqDrawerList(filterText = '') {
    this.dom.faqList.innerHTML = '';
    const cleanFilter = filterText.toLowerCase().trim();

    const filtered = this.faqs.filter(faq => {
      const matchesCat = this.currentCategory === 'all' || faq.category === this.currentCategory;
      const matchesText = !cleanFilter ||
        faq.question.toLowerCase().includes(cleanFilter) ||
        faq.answer.toLowerCase().includes(cleanFilter) ||
        (faq.keywords && faq.keywords.some(k => k.toLowerCase().includes(cleanFilter)));
      return matchesCat && matchesText;
    });

    this.dom.faqCountBadge.textContent = `${filtered.length} FAQs`;

    if (filtered.length === 0) {
      this.dom.faqList.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 24px;">No FAQs found matching "${filterText}".</div>`;
      return;
    }

    filtered.forEach(faq => {
      const card = document.createElement('div');
      card.className = 'faq-card';

      const cat = document.createElement('div');
      cat.className = 'faq-card-cat';
      cat.textContent = faq.category;

      const q = document.createElement('div');
      q.className = 'faq-card-question';
      q.textContent = faq.question;

      const actions = document.createElement('div');
      actions.className = 'faq-card-actions';

      const btnAsk = document.createElement('button');
      btnAsk.className = 'btn-ask-this';
      btnAsk.innerHTML = `💬 Ask in Chat`;
      btnAsk.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.textInput.value = faq.question;
        this.handleUserQuery(faq.question);
        if (window.innerWidth < 768) {
          this.closeFaqDrawer();
        }
      });

      const btnListen = document.createElement('button');
      btnListen.className = 'btn-listen-this';
      btnListen.innerHTML = `🔊 Listen`;
      btnListen.addEventListener('click', (e) => {
        e.stopPropagation();
        this.speak(faq.answer);
      });

      actions.appendChild(btnAsk);
      actions.appendChild(btnListen);

      card.appendChild(cat);
      card.appendChild(q);
      card.appendChild(actions);

      card.addEventListener('click', () => {
        this.dom.textInput.value = faq.question;
        this.handleUserQuery(faq.question);
      });

      this.dom.faqList.appendChild(card);
    });
  }

  openFaqDrawer() {
    this.dom.faqDrawer.classList.remove('closed');
  }

  closeFaqDrawer() {
    this.dom.faqDrawer.classList.add('closed');
  }

  /* ==========================================================================
     Export Chat Transcripts
     ========================================================================== */
  exportConversation() {
    if (this.messages.length === 0) {
      alert('No messages to export yet.');
      return;
    }

    let markdown = `# VoxGenAI - Voice FAQ Conversation Transcript\n\n`;
    markdown += `**Exported At:** ${new Date().toLocaleString()}\n`;
    markdown += `**Total Messages:** ${this.messages.length}\n\n---\n\n`;

    this.messages.forEach(msg => {
      const sender = msg.sender === 'bot' ? '🤖 VoxGenAI' : '👤 User';
      const time = msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      markdown += `### ${sender} (${time})\n\n${msg.text}\n\n`;
      if (msg.confidence > 0 && msg.sender === 'bot') {
        markdown += `*Confidence:* ${msg.confidence}%\n\n`;
      }
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VoxGenAI_Transcript_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /* ==========================================================================
     Event Bindings
     ========================================================================== */
  bindEvents() {
    // Mic Button
    this.dom.btnMic.addEventListener('click', () => this.toggleMicrophone());

    // Send Button
    this.dom.btnSend.addEventListener('click', () => {
      const text = this.dom.textInput.value.trim();
      if (text) {
        this.dom.textInput.value = '';
        this.handleUserQuery(text);
      }
    });

    // Enter Key
    this.dom.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = this.dom.textInput.value.trim();
        if (text) {
          this.dom.textInput.value = '';
          this.handleUserQuery(text);
        }
      }
    });

    // Spacebar to toggle mic if not typing in input
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.activeElement !== this.dom.textInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.toggleMicrophone();
      }
    });

    // Stop Speech button
    this.dom.btnStopSpeech.addEventListener('click', () => this.stopSpeaking());

    // Category chips
    this.dom.categoryChips.addEventListener('click', (e) => {
      if (e.target.classList.contains('chip')) {
        this.dom.categoryChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        this.currentCategory = e.target.getAttribute('data-category');
        this.renderFaqDrawerList(this.dom.faqSearchInput.value);
      }
    });

    // Drawer Toggles
    this.dom.btnToggleFaq.addEventListener('click', () => {
      this.dom.faqDrawer.classList.toggle('closed');
    });
    this.dom.btnCloseFaq.addEventListener('click', () => this.closeFaqDrawer());
    this.dom.faqSearchInput.addEventListener('input', (e) => {
      this.renderFaqDrawerList(e.target.value);
    });

    // Settings Modal
    this.dom.btnOpenSettings.addEventListener('click', () => {
      this.dom.speechRate.value = this.settings.rate;
      this.dom.speechRateVal.textContent = `${this.settings.rate}x`;
      this.dom.speechPitch.value = this.settings.pitch;
      this.dom.speechPitchVal.textContent = this.settings.pitch;
      this.dom.autoSpeakToggle.checked = this.settings.autoSpeak;
      this.dom.continuousSttToggle.checked = this.settings.continuous;
      this.dom.soundEffectsToggle.checked = this.settings.chimes;
      if (this.settings.voiceUri) {
        this.dom.voiceSelect.value = this.settings.voiceUri;
      }
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });

    this.dom.speechRate.addEventListener('input', (e) => {
      this.dom.speechRateVal.textContent = `${e.target.value}x`;
    });

    this.dom.speechPitch.addEventListener('input', (e) => {
      this.dom.speechPitchVal.textContent = e.target.value;
    });

    this.dom.btnTestVoice = document.getElementById('btn-test-voice');
    this.dom.btnTestVoice.addEventListener('click', () => {
      const prevVoice = this.settings.voiceUri;
      this.settings.voiceUri = this.dom.voiceSelect.value;
      this.settings.rate = parseFloat(this.dom.speechRate.value);
      this.settings.pitch = parseFloat(this.dom.speechPitch.value);
      this.speak('Hello! This is a test of the VoxGenAI voice engine.');
    });

    this.dom.btnSaveSettings.addEventListener('click', () => {
      this.settings.voiceUri = this.dom.voiceSelect.value;
      this.settings.rate = parseFloat(this.dom.speechRate.value);
      this.settings.pitch = parseFloat(this.dom.speechPitch.value);
      this.settings.autoSpeak = this.dom.autoSpeakToggle.checked;
      this.settings.continuous = this.dom.continuousSttToggle.checked;
      this.settings.chimes = this.dom.soundEffectsToggle.checked;
      this.saveSettings();

      if (this.recognition) {
        this.recognition.continuous = this.settings.continuous;
      }

      this.dom.settingsModal.classList.add('hidden');
    });

    // Custom FAQ Modal
    this.dom.btnOpenCustomFaq.addEventListener('click', () => {
      this.dom.customFaqModal.classList.remove('hidden');
    });

    const closeCustomFaq = () => this.dom.customFaqModal.classList.add('hidden');
    this.dom.btnCloseCustomFaq.addEventListener('click', closeCustomFaq);
    this.dom.btnCancelCustomFaq.addEventListener('click', closeCustomFaq);

    this.dom.btnSaveCustomFaq.addEventListener('click', () => {
      const category = this.dom.newFaqCat.value.trim() || 'General';
      const question = this.dom.newFaqQ.value.trim();
      const answer = this.dom.newFaqA.value.trim();
      const keywords = this.dom.newFaqKw.value.split(',').map(k => k.trim()).filter(k => k.length > 0);

      if (!question || !answer) {
        alert('Please provide both question and answer.');
        return;
      }

      const newFaq = {
        id: `custom-${Date.now()}`,
        category,
        question,
        answer,
        keywords
      };

      this.customFaqs.push(newFaq);
      this.saveCustomFaqs();
      this.mergeFaqData();
      this.renderFaqDrawerList();

      this.dom.newFaqCat.value = '';
      this.dom.newFaqQ.value = '';
      this.dom.newFaqA.value = '';
      this.dom.newFaqKw.value = '';
      closeCustomFaq();

      this.respond(`Added new custom FAQ for "${question}" to the knowledge base!`, 100);
    });

    // Export & Clear
    this.dom.btnExportChat.addEventListener('click', () => this.exportConversation());
    this.dom.btnClearChat.addEventListener('click', () => {
      if (confirm('Clear all conversation messages?')) {
        this.clearChat();
        this.renderWelcomeMessage();
      }
    });
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new VoiceFAQApp();
});
