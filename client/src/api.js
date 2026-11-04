async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Có lỗi xảy ra, em thử lại nhé.');
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Nhận câu trả lời theo từng câu (NDJSON) để đọc thành tiếng ngay. onSentence được gọi cho mỗi câu. */
async function chatStream(payload, onSentence, signal) {
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Có lỗi xảy ra, em thử lại nhé.');
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const handle = (line) => {
    if (!line.trim()) return;
    const o = JSON.parse(line);
    if (o.type === 'sentence') onSentence(o.text);
    else if (o.type === 'error') throw new Error(o.message);
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      handle(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
    }
  }
  handle(buf);
}

/** Xin file âm thanh của một câu; trả về địa chỉ tạm để phát (nhớ revokeObjectURL sau khi phát). */
async function tts(text) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  return URL.createObjectURL(await res.blob());
}

export const api = {
  chatStream,
  tts,
  health: () => request('/health'),
  characters: () => request('/characters').then((d) => d.characters),
  character: (slug) => request(`/characters/${slug}`),
  chat: (payload) => request('/chat', { method: 'POST', body: payload }),
  story: (characterId, eventId) => request('/story', { method: 'POST', body: { characterId, eventId } }),
  feedback: (payload) => request('/feedback', { method: 'POST', body: payload }),
};
