import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const VOICE_KEY = 'ttkc-voice';

export function getViVoices() {
  return (synth?.getVoices?.() ?? []).filter((v) => /^vi/i.test(v.lang));
}

// Ưu tiên giọng nam, giọng "Natural/Online" (Edge) rồi mới đến giọng khác
function voiceScore(v) {
  let s = 0;
  if (/nam ?minh|male|nam/i.test(v.name) && !/female/i.test(v.name)) s += 4;
  if (/natural|online/i.test(v.name)) s += 2;
  if (/hoai ?my|female/i.test(v.name)) s -= 1;
  return s;
}

export function savedVoiceName() {
  try { return localStorage.getItem(VOICE_KEY) || ''; } catch { return ''; }
}

export function saveVoiceName(name) {
  try { localStorage.setItem(VOICE_KEY, name); } catch { /* bỏ qua */ }
}

export function pickVoice() {
  const voices = getViVoices();
  const saved = savedVoiceName();
  return voices.find((v) => v.name === saved)
    || [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))[0]
    || null;
}

/** Tách đoạn văn thành câu để đọc từng câu và tô sáng (FR-VOI-03). */
export function splitSentences(text) {
  return (text || '')
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Đọc thành tiếng: mỗi câu được server tạo thành file âm thanh (một giọng chung cho mọi nhân vật),
 * câu sau được tạo trong lúc câu trước đang phát. Nếu không tạo được file thì đọc bằng giọng trình duyệt.
 */
export function useSpeech() {
  const [speakingId, setSpeakingId] = useState(null);
  const [index, setIndex] = useState(-1);
  const token = useRef(0);
  const audioRef = useRef(null);
  const supported = true;

  const stop = useCallback(() => {
    token.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    synth?.cancel();
    setSpeakingId(null);
    setIndex(-1);
  }, []);

  const speak = useCallback((id, sentences, voice = {}) => {
    if (!sentences.length) return;
    synth?.cancel();
    audioRef.current?.pause();
    const mine = ++token.current;
    setSpeakingId(id);

    const urls = [];
    const fetchAt = (i) => {
      if (i < sentences.length && !urls[i]) urls[i] = api.tts(sentences[i]).catch(() => null);
      return urls[i];
    };
    const browserSpeak = (text, done) => {
      if (!synth) { done(); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'vi-VN';
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = voice.rate ?? 1;
      u.pitch = voice.pitch ?? 1;
      u.onend = done;
      u.onerror = done;
      synth.speak(u);
    };
    const run = async (i) => {
      if (mine !== token.current) return;
      if (i >= sentences.length) {
        setSpeakingId(null);
        setIndex(-1);
        return;
      }
      fetchAt(i);
      fetchAt(i + 1);
      const url = await urls[i];
      if (mine !== token.current) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      setIndex(i);
      const done = () => run(i + 1);
      if (!url) { browserSpeak(sentences[i], done); return; }
      const el = new Audio(url);
      audioRef.current = el;
      const ended = () => { URL.revokeObjectURL(url); done(); };
      el.onended = ended;
      el.onerror = ended;
      el.play().catch(() => { URL.revokeObjectURL(url); browserSpeak(sentences[i], done); });
    };
    run(0);
  }, []);

  useEffect(() => stop, [stop]);

  return { supported, speakingId, index, speak, stop };
}

/** Nhập câu hỏi bằng giọng nói (Web Speech API, FR-VOI-04). Ẩn nếu trình duyệt không hỗ trợ. */
export function useListen(onText) {
  const [listening, setListening] = useState(false);
  const rec = useRef(null);
  const supported = !!Recognition;

  const start = useCallback(() => {
    if (!Recognition) return;
    const r = new Recognition();
    r.lang = 'vi-VN';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => onText(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }, [onText]);

  const stop = useCallback(() => rec.current?.stop(), []);
  return { supported, listening, start, stop };
}
