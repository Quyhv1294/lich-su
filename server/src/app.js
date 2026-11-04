import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { config, mode } from './config.js';
import charactersRouter from './routes/characters.js';
import chatRouter from './routes/chat.js';
import storyRouter from './routes/story.js';
import feedbackRouter from './routes/feedback.js';
import ttsRouter from './routes/tts.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, mode: mode(), version: '0.1.0' }));
  app.use('/api/characters', charactersRouter);

  // Giới hạn tần suất cho các API tốn chi phí AI (FR-SAFE-06, BR-11)
  const limiter = rateLimit({
    windowMs: config.rate.windowMs,
    max: config.rate.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ code: 'RATE_LIMITED', message: 'Em hỏi nhanh quá, vui lòng chờ một lát nhé.', retryAfterSec: Math.ceil(config.rate.windowMs / 1000) }),
  });
  app.use('/api/chat', limiter, chatRouter);
  app.use('/api/story', limiter, storyRouter);
  // Mỗi câu trả lời được đọc thành nhiều yêu cầu nên hạn mức cao hơn
  const ttsLimiter = rateLimit({
    windowMs: config.rate.windowMs,
    max: config.rate.max * 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ code: 'RATE_LIMITED', message: 'Em hỏi nhanh quá, vui lòng chờ một lát nhé.' }),
  });
  app.use('/api/tts', ttsLimiter, ttsRouter);
  app.use('/api/feedback', feedbackRouter);

  // Phục vụ bản build của client khi chạy production
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('[error]', err.message);
    res.status(500).json({ code: 'UPSTREAM_ERROR', message: 'Có lỗi xảy ra, em thử lại nhé.' });
  });
  return app;
}
