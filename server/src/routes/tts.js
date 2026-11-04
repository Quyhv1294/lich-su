import { Router } from 'express';
import { synthesize, ttsAvailable } from '../services/tts.js';
import { checkOutput } from '../services/guardrail.js';

const router = Router();

// POST /api/tts  { text }  ->  file âm thanh của câu đó (wav hoặc mp3)
router.post('/', async (req, res) => {
  const raw = req.body?.text;
  if (typeof raw !== 'string' || !raw.trim()) return res.status(400).json({ code: 'INVALID_INPUT', message: 'Thiếu nội dung cần đọc' });
  if (!ttsAvailable()) return res.status(503).json({ code: 'TTS_OFF', message: 'Chưa cấu hình giọng đọc' });
  const text = checkOutput(raw).text.slice(0, 400);
  try {
    const { buffer, mime } = await synthesize(text);
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.warn(`[tts] lỗi: ${err.message}`);
    res.status(502).json({ code: 'TTS_FAILED', message: 'Không tạo được giọng đọc' });
  }
});

export default router;
