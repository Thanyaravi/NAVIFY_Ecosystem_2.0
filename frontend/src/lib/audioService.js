// NAVIFY Advanced Spatial Audio & Web Speech Guidance Engine
// Department of CSE (AI & ML) - Sai Vidya Institute of Technology (SVIT)

class AudioService {
  constructor() {
    this.audioCtx = null;
    this.currentVoice = null;
    this.isSpeaking = false;
    this.listeners = new Set();
    this.lastSpokenText = "";
    this.lastSpokenTime = 0;
    this.enabled = true;

    if (typeof window !== "undefined") {
      this.initVoices();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  getAudioContext() {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  initVoices() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return;

    // Prefer clear, natural English voices
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Google") ||
          v.name.includes("Natural") ||
          v.name.includes("Samantha") ||
          v.name.includes("Zira") ||
          v.name.includes("Karen") ||
          v.name.includes("David"))
    ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];

    this.currentVoice = preferred;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data) {
    this.listeners.forEach((fn) => fn(event, data));
  }

  // Futuristic Sound Synthesizer via Web Audio API
  playTone(type = "ping") {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === "ping") {
        // High-tech sonar blip
        osc.type = "sine";
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === "hazard") {
        // Urgent dual-pulse caution beep
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(440, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === "chime") {
        // Harmonic welcome / success chime
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      /* ignore audio context restrictions */
    }
  }

  // Speak with speech queue deduplication and natural cadence
  speak(text, { priority = "normal", immediate = false } = {}) {
    if (!this.enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!text || typeof text !== "string") return;

    const cleanText = text.trim();
    const now = Date.now();

    // Prevent repeated announcements within 3 seconds unless immediate hazard
    if (!immediate && cleanText === this.lastSpokenText && now - this.lastSpokenTime < 3500) {
      return;
    }

    this.lastSpokenText = cleanText;
    this.lastSpokenTime = now;

    try {
      if (immediate || window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (this.currentVoice) utterance.voice = this.currentVoice;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.notify("start", cleanText);
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.notify("end", cleanText);
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.notify("end", cleanText);
      };

      // Sound feedback before speaking
      if (immediate) {
        this.playTone("hazard");
      } else {
        this.playTone("ping");
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
    }
  }

  // Interactive Test Voice function
  testVoice() {
    this.playTone("chime");
    const phrases = [
      "NAVIFY audio feedback confirmed. Object detection and voice navigation are fully operational.",
      "Spatial navigation online. Distance calibration set to metric steps.",
      "Object recognition active. CANIE spatial guidance ready.",
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    this.speak(phrase, { immediate: true });
    return phrase;
  }

  stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.notify("end", "");
  }
}

export const audioService = new AudioService();
