import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { sharedAudio, unlockAudio } from '../audio.js';

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
 * Đọc thành tiếng: cả câu trả lời được server tạo thành MỘT file âm thanh (một giọng chung cho mọi nhân vật).
 * Nếu không tạo được file thì đọc bằng giọng trình duyệt.
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
    unlockAudio();
    synth?.cancel();
    audioRef.current?.pause();
    const mine = ++token.current;
    setSpeakingId(id);

    const finish = () => {
      if (mine !== token.current) return;
      setSpeakingId(null);
      setIndex(-1);
    };
    // Giọng trình duyệt (chỉ khi không tạo được file âm thanh): đọc lần lượt từng câu
    const browserRun = (i) => {
      if (mine !== token.current) return;
      if (i >= sentences.length || !synth) { finish(); return; }
      setIndex(i);
      const u = new SpeechSynthesisUtterance(sentences[i]);
      u.lang = 'vi-VN';
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = voice.rate ?? 1;
      u.pitch = voice.pitch ?? 1;
      u.onend = () => browserRun(i + 1);
      u.onerror = () => browserRun(i + 1);
      synth.speak(u);
    };

    // Cả câu trả lời được tạo thành một file duy nhất để giọng đọc đồng nhất từ đầu đến cuối
    (async () => {
      const url = await api.tts(sentences.join(' ')).catch(() => null);
      if (mine !== token.current) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      if (!url) { browserRun(0); return; }
      const el = sharedAudio();
      audioRef.current = el;
      // Tô sáng câu đang đọc theo tỉ lệ độ dài chữ so với thời lượng file
      const total = sentences.reduce((n, s) => n + s.length, 0);
      let acc = 0;
      const bounds = sentences.map((s) => (acc += s.length) / total);
      el.ontimeupdate = () => {
        if (!el.duration || mine !== token.current) return;
        const i = bounds.findIndex((b) => el.currentTime / el.duration <= b);
        setIndex(i < 0 ? sentences.length - 1 : i);
      };
      const done = () => { URL.revokeObjectURL(url); finish(); };
      el.onended = done;
      el.onerror = done;
      el.src = url;
      setIndex(0);
      el.play().catch(() => { URL.revokeObjectURL(url); browserRun(0); });
    })();
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
