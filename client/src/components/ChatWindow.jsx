import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { splitSentences, useListen } from '../hooks/useSpeech.js';

const REASONS = [
  ['wrong_fact', 'Sai sự kiện'],
  ['off_character', 'Không đúng vai'],
  ['hard_to_understand', 'Khó hiểu'],
  ['inappropriate', 'Không phù hợp'],
];

let seq = 0;
const nextId = () => `m${++seq}`;

export default function ChatWindow({ character, speech }) {
  const [messages, setMessages] = useState(() => [
    { id: nextId(), role: 'assistant', text: character.greeting, greeting: true },
  ]);
  const [suggestions, setSuggestions] = useState(character.suggestions);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);
  const listen = useListen(useCallback((t) => setInput(t), []));

  // Mở tướng nào là tướng ấy tự đọc lời giới thiệu
  useEffect(() => {
    speech.speak(messages[0].id, splitSentences(character.greeting), character.voice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  useEffect(() => {
    // Chỉ cuộn khung chat, không làm cuộn cả trang
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text) {
    const message = text.trim();
    if (!message || loading) return;
    const history = messages
      .filter((m) => !m.greeting && !m.error)
      .slice(-12)
      .map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { id: nextId(), role: 'user', text: message }]);
    setInput('');
    setSuggestions([]);
    setLoading(true);
    try {
      const r = await api.chat({ characterId: character.id, message, history });
      setMessages((m) => [
        ...m,
        { id: nextId(), role: 'assistant', text: r.reply, sources: r.sources, mode: r.mode, flagged: r.flagged },
      ]);
      setSuggestions(r.followUps || []);
    } catch (err) {
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', text: err.message, error: true }]);
      setSuggestions(character.suggestions);
    } finally {
      setLoading(false);
    }
  }

  function rate(msg, rating, reason) {
    setMessages((all) => all.map((m) => (m.id === msg.id ? { ...m, rating, reason: reason ?? m.reason } : m)));
    api.feedback({ characterId: character.id, rating, reason }).catch(() => {});
  }

  return (
    <section className="chat" aria-label={`Trò chuyện với ${character.name}`}>
      <div className="chat__log" role="log" aria-live="polite" ref={logRef}>
        {messages.map((m) => {
          const sentences = splitSentences(m.text);
          const speaking = speech.speakingId === m.id;
          return (
            <div key={m.id} className={`msg msg--${m.role} ${m.error ? 'msg--error' : ''}`}>
              {m.role === 'assistant' && !m.error && (
                <img className="msg__avatar" src={character.avatar} alt="" />
              )}
              <div className="msg__bubble">
                {m.role === 'assistant' && !m.error && <span className="msg__who">{character.name}</span>}
                <p className="msg__text">
                  {m.role === 'assistant'
                    ? sentences.map((s, i) => (
                        <span key={i} className={speaking && speech.index === i ? 'hl' : ''}>{s} </span>
                      ))
                    : m.text}
                </p>
                {m.role === 'assistant' && !m.greeting && !m.error && (
                  <div className="msg__tools">
                    {speech.supported && (
                      <button
                        className="tool"
                        onClick={() => (speaking ? speech.stop() : speech.speak(m.id, sentences, character.voice))}
                      >
                        {speaking ? '⏹ Dừng' : '🔊 Nghe'}
                      </button>
                    )}
                    <button className={`tool ${m.rating === 'up' ? 'tool--on' : ''}`} onClick={() => rate(m, 'up')} aria-label="Hữu ích">👍</button>
                    <button className={`tool ${m.rating === 'down' ? 'tool--on' : ''}`} onClick={() => rate(m, 'down')} aria-label="Chưa tốt">👎</button>
                    {m.sources?.length > 0 && <span className="msg__src">Nguồn nội bộ: {m.sources.length} mục</span>}
                  </div>
                )}
                {m.rating === 'down' && !m.reason && (
                  <div className="reasons">
                    <span>Vì sao?</span>
                    {REASONS.map(([k, label]) => (
                      <button key={k} className="chip chip--btn" onClick={() => rate(m, 'down', k)}>{label}</button>
                    ))}
                  </div>
                )}
                {m.reason && <p className="msg__thanks">Cảm ơn em, góp ý đã được ghi nhận.</p>}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="msg msg--assistant">
            <img className="msg__avatar" src={character.avatar} alt="" />
            <div className="msg__bubble"><span className="typing" aria-label="Đang trả lời"><i /><i /><i /></span></div>
          </div>
        )}
      </div>

      {suggestions.length > 0 && !loading && (
        <div className="suggest" aria-label="Gợi ý câu hỏi">
          {suggestions.map((s) => (
            <button key={s} className="chip chip--suggest" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={300}
          placeholder={`Hỏi ${character.name} một điều gì đó…`}
          aria-label="Câu hỏi của em"
        />
        {listen.supported && (
          <button
            type="button"
            className={`icon-btn ${listen.listening ? 'icon-btn--on' : ''}`}
            onClick={listen.listening ? listen.stop : listen.start}
            aria-label="Nói câu hỏi"
          >🎤</button>
        )}
        <button className="btn btn--primary" type="submit" disabled={loading || !input.trim()}>Gửi</button>
      </form>
    </section>
  );
}
