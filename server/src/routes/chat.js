import { Router } from 'express';
import { getCharacter } from '../services/characterStore.js';
import { checkInput, checkOutput, safeReply } from '../services/guardrail.js';
import { retrieve } from '../services/retrieval.js';
import { generateChat, streamSentences } from '../services/llm.js';
import { mode } from '../config.js';

const router = Router();

// POST /api/chat  { characterId, message, history?: [{role, text}] }
router.post('/', async (req, res) => {
  const { characterId, message, history } = req.body ?? {};
  const character = getCharacter(characterId);
  if (!character) return res.status(404).json({ code: 'NOT_FOUND', message: 'Không tìm thấy nhân vật' });
  if (typeof message !== 'string') return res.status(400).json({ code: 'INVALID_INPUT', message: 'Thiếu câu hỏi' });

  const started = Date.now();
  const input = checkInput(message);

  // Đầu vào vi phạm hoặc ngoài thời đại: trả lời theo vai, không gọi AI (UC-40, BR-02)
  if (!input.ok || (input.category === 'modern' && mode() !== 'gemini')) {
    const category = input.category;
    return res.json({
      reply: safeReply(character, category),
      followUps: character.suggestions.slice(0, 2),
      sources: [],
      mode: 'guardrail',
      flagged: ['injection', 'unsafe'].includes(category),
      category,
    });
  }

  const chunks = retrieve(character, input.text);
  const safeHistory = Array.isArray(history)
    ? history.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    : [];

  const result = await generateChat({ character, message: input.text, history: safeHistory, chunks });
  const out = checkOutput(result.text);

  // Log ẩn danh: không ghi IP hay định danh (BR-12)
  console.log(JSON.stringify({
    at: new Date().toISOString(), character: character.id, mode: result.mode,
    sources: result.sources, unknown: !!result.unknown, flagged: out.flagged, ms: Date.now() - started,
  }));

  res.json({
    reply: out.text,
    followUps: result.followUps,
    sources: result.sources,
    mode: result.mode,
    flagged: out.flagged,
    degraded: !!result.degraded,
  });
});

// POST /api/chat/stream  — như /api/chat nhưng trả về từng câu (NDJSON) để đọc thành tiếng ngay (chế độ gọi).
router.post('/stream', async (req, res) => {
  const { characterId, message, history } = req.body ?? {};
  const character = getCharacter(characterId);
  if (!character) return res.status(404).json({ code: 'NOT_FOUND', message: 'Không tìm thấy nhân vật' });
  if (typeof message !== 'string') return res.status(400).json({ code: 'INVALID_INPUT', message: 'Thiếu câu hỏi' });

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders?.();
  const send = (obj) => res.write(`${JSON.stringify(obj)}
`);

  const started = Date.now();
  const input = checkInput(message);
  let reply = '';
  let flagged = false;
  let outMode = mode() === 'gemini' ? 'gemini' : 'mock';

  try {
    if (!input.ok || (input.category === 'modern' && mode() !== 'gemini')) {
      reply = safeReply(character, input.category);
      flagged = ['injection', 'unsafe'].includes(input.category);
      outMode = 'guardrail';
      send({ type: 'sentence', text: reply });
    } else {
      const chunks = retrieve(character, input.text);
      const safeHistory = Array.isArray(history)
        ? history.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
        : [];
      const sentences = [];
      for await (const raw of streamSentences({ character, message: input.text, history: safeHistory, chunks, call: true })) {
        const out = checkOutput(raw);
        if (!out.text) continue;
        flagged = flagged || out.flagged;
        sentences.push(out.text);
        send({ type: 'sentence', text: out.text });
      }
      reply = sentences.join(' ');
    }
    send({ type: 'done', reply, mode: outMode, flagged });
  } catch (err) {
    console.warn(`[chat/stream] lỗi: ${err.message}`);
    send({ type: 'error', message: 'Đường truyền có chút trục trặc, em hỏi lại ta nhé.' });
  } finally {
    console.log(JSON.stringify({
      at: new Date().toISOString(), character: character.id, mode: outMode, stream: true, flagged, ms: Date.now() - started,
    }));
    res.end();
  }
});

export default router;
