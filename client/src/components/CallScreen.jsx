import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { pickVoice, splitSentences } from '../hooks/useSpeech.js';
import { sharedAudio } from '../audio.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const STATUS = {
  idle: '',
  listening: 'Đang nghe em nói…',
  thinking: 'Đang suy nghĩ…',
  speaking: 'Đang nói…',
  muted: 'Đã tắt mic',
};

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Cuộc gọi thoại với nhân vật: nghe → hỏi → đọc câu trả lời → nghe tiếp (bản demo, giọng trình duyệt). */
export default function CallScreen({ character, onClose }) {
  const [phase, setPhaseState] = useState('idle');
  const [heard, setHeard] = useState('');
  const [line, setLine] = useState('');
  const [suggestions, setSuggestions] = useState(character.suggestions);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [typed, setTyped] = useState('');

  const phaseRef = useRef('idle');
  const activeRef = useRef(true);
  const mutedRef = useRef(false);
  const recRef = useRef(null);
  const speakToken = useRef(0);
  const history = useRef([]);
  const abortRef = useRef(null);
  const audioRef = useRef(null);
  const silenceRef = useRef(null); // hẹn giờ nhận biết người nói đã dừng
  const sendHeardRef = useRef(() => {});

  const setPhase = useCallback((p) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const stopRec = useCallback(() => {
    clearTimeout(silenceRef.current);
    const r = recRef.current;
    recRef.current = null;
    if (r) {
      r.onend = null;
      r.onerror = null;
      r.onresult = null;
      try { r.abort(); } catch { /* đã dừng */ }
    }
  }, []);

  // Đọc bằng giọng máy của trình duyệt (chỉ dùng khi không tạo được file âm thanh)
  const browserSpeak = useCallback((text, done) => {
    if (!synth) { setTimeout(done, 1800); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = character.voice?.rate ?? 1;
    u.pitch = character.voice?.pitch ?? 1;
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
  }, [character.voice]);

  // Gom các câu đến từ LLM, hết câu trả lời thì tạo MỘT file âm thanh cho cả câu trả lời rồi phát
  // (tạo từng câu riêng thì giọng mỗi câu một khác)
  const speakStream = useCallback(() => {
    synth?.cancel();
    audioRef.current?.pause();
    const mine = ++speakToken.current;
    const parts = [];
    let finish;
    const promise = new Promise((r) => { finish = r; });
    const play = async () => {
      const text = parts.join(' ').trim();
      if (!text) { finish(); return; }
      const url = await api.tts(text).catch(() => null);
      if (mine !== speakToken.current || !activeRef.current) {
        if (url) URL.revokeObjectURL(url);
        finish();
        return;
      }
      setPhase('speaking');
      setLine(text);
      if (!url) { browserSpeak(text, finish); return; }
      const el = sharedAudio();
      audioRef.current = el;
      const done = () => { URL.revokeObjectURL(url); finish(); };
      el.onended = done;
      el.onerror = done;
      el.src = url;
      el.play().catch(() => { URL.revokeObjectURL(url); browserSpeak(text, finish); });
    };
    return {
      promise,
      push(s) { parts.push(s); },
      end() { play(); },
    };
  }, [browserSpeak, setPhase]);

  const speak = useCallback(async (text) => {
    const player = speakStream();
    splitSentences(text).forEach((s) => player.push(s));
    player.end();
    await player.promise;
  }, [speakStream]);

  const ask = useCallback(async (text) => {
    const message = text.trim();
    if (!message || !activeRef.current) return;
    stopRec();
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setHeard(message);
    setSuggestions([]);
    setPhase('thinking');
    const past = history.current.slice(-12);
    history.current.push({ role: 'user', text: message });
    const player = speakStream();
    const said = [];
    try {
      await api.chatStream({ characterId: character.id, message, history: past }, (s) => {
        said.push(s);
        player.push(s);
      }, ctrl.signal);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!said.length) {
        said.push('Đường truyền có chút trục trặc, em hỏi lại ta nhé.');
        player.push(said[0]);
      }
    }
    player.end();
    if (!activeRef.current) return;
    history.current.push({ role: 'assistant', text: said.join(' ') });
    await player.promise;
    // Đọc xong (hoặc câu trả lời rỗng/lỗi) thì quay lại nghe, trừ khi người dùng đã chuyển sang trạng thái khác
    if (activeRef.current && (phaseRef.current === 'speaking' || phaseRef.current === 'thinking')) listenRef.current();
  }, [character.id, speakStream, stopRec, setPhase]);

  const listenRef = useRef(() => {});
  const listen = useCallback(() => {
    if (!activeRef.current || mutedRef.current || !Recognition) return;
    stopRec();
    setPhase('listening');
    const rec = new Recognition();
    rec.lang = 'vi-VN';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    // Trình duyệt (nhất là iPhone) thường không báo "đã nói xong": chữ cứ hiện dần mà kết quả cuối không đến.
    // Nên tự coi là nói xong khi im lặng đủ lâu, hoặc khi micro tự dừng mà đã có chữ.
    const SILENCE_MS = 1400;
    let latest = '';
    let submitted = false;
    const submit = () => {
      const t = latest.trim();
      if (submitted || !t || recRef.current !== rec) return;
      submitted = true;
      clearTimeout(silenceRef.current);
      ask(t);
    };
    sendHeardRef.current = submit;
    rec.onresult = (e) => {
      const results = Array.from(e.results);
      latest = results.map((r) => r[0].transcript).join(' ');
      setHeard(latest);
      clearTimeout(silenceRef.current);
      if (results[results.length - 1].isFinal) submit();
      else silenceRef.current = setTimeout(submit, SILENCE_MS);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Trình duyệt chưa được phép dùng micro. Em hãy cho phép micro rồi gọi lại, hoặc gõ câu hỏi bên dưới.');
        recRef.current = null;
        setPhase('idle');
      }
    };
    rec.onend = () => {
      clearTimeout(silenceRef.current);
      if (latest.trim() && !submitted) { submit(); return; }
      if (recRef.current === rec) recRef.current = null;
      if (!submitted && phaseRef.current === 'listening' && activeRef.current) setTimeout(() => listenRef.current(), 250);
    };
    recRef.current = rec;
    try { rec.start(); } catch { /* đang chạy */ }
  }, [ask, stopRec, setPhase]);
  listenRef.current = listen;

  // Bắt đầu cuộc gọi: nhân vật chào trước rồi mới nghe
  useEffect(() => {
    activeRef.current = true;
    if (!Recognition) setError('Trình duyệt này chưa hỗ trợ nhận giọng nói. Em hãy dùng Chrome hoặc Edge, hoặc gõ câu hỏi bên dưới.');
    history.current = [];
    (async () => {
      await speak(character.greeting);
      if (activeRef.current) listenRef.current();
    })();
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      activeRef.current = false;
      clearInterval(timer);
      speakToken.current += 1;
      abortRef.current?.abort();
      audioRef.current?.pause();
      synth?.cancel();
      stopRec();
    };
  }, [character.greeting, speak, stopRec]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function interrupt() {
    abortRef.current?.abort();
    audioRef.current?.pause();
    speakToken.current += 1;
    synth?.cancel();
    setLine('');
    listen();
  }

  function toggleMute() {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (next) {
      stopRec();
      if (phaseRef.current === 'listening') setPhase('muted');
    } else if (phaseRef.current === 'muted') {
      listen();
    }
  }

  function submitTyped(e) {
    e.preventDefault();
    const t = typed;
    setTyped('');
    ask(t);
  }

  const active = phase === 'speaking' || phase === 'listening';

  return (
    <div className="call" role="dialog" aria-modal="true" aria-label={`Cuộc gọi với ${character.name}`} style={{ '--accent': character.accent }}>
      <div className="call__bg" style={{ backgroundImage: `url(${character.avatar})` }} aria-hidden="true" />
      <div className="call__inner">
        <p className="call__timer">{fmt(seconds)}</p>

        <div className={`call__avatar call__avatar--${phase}`}>
          <span className="call__ring" aria-hidden="true" />
          <img src={character.avatar} alt={`Ảnh minh hoạ ${character.name}`} />
        </div>

        <h2 className="call__name">{character.name}</h2>
        <p className="call__title">{character.title}</p>
        <p className="call__status" aria-live="polite">{STATUS[phase]}</p>

        <div className="call__text" aria-live="polite">
          {phase === 'speaking' && line && <p className="call__line">{line}</p>}
          {phase !== 'speaking' && heard && <p className="call__heard">Em: “{heard}”</p>}
        </div>

        {phase === 'listening' && heard && (
          <button type="button" className="btn btn--primary call__send" onClick={() => sendHeardRef.current()}>Gửi câu hỏi</button>
        )}

        {error && <p className="msg--error call__error">{error}</p>}

        {suggestions.length > 0 && (
          <div className="call__suggest">
            {suggestions.map((s) => (
              <button key={s} type="button" className="chip chip--suggest" onClick={() => ask(s)}>{s}</button>
            ))}
          </div>
        )}

        <form className="call__typed" onSubmit={submitTyped}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Hoặc gõ câu hỏi…"
            aria-label="Gõ câu hỏi"
            maxLength={300}
          />
          <button className="btn btn--primary" disabled={!typed.trim() || phase === 'thinking'}>Gửi</button>
        </form>

        <div className="call__controls">
          {Recognition && (
            <button type="button" className={`call__btn ${muted ? 'call__btn--on' : ''}`} onClick={toggleMute} aria-pressed={muted}>
              <span aria-hidden="true">{muted ? '🔇' : '🎤'}</span>
              <small>{muted ? 'Bật mic' : 'Tắt mic'}</small>
            </button>
          )}
          <button type="button" className="call__btn call__btn--end" onClick={onClose}>
            <span aria-hidden="true">📞</span>
            <small>Kết thúc</small>
          </button>
          <button type="button" className="call__btn" onClick={interrupt} disabled={!active || phase !== 'speaking'}>
            <span aria-hidden="true">✋</span>
            <small>Ngắt lời</small>
          </button>
        </div>
      </div>
    </div>
  );
}
