import 'dotenv/config';

const num = (v, d) => (Number.isFinite(Number(v)) && v !== undefined && v !== '' ? Number(v) : d);

export const config = {
  port: num(process.env.PORT, 4000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  tts: {
    provider: process.env.TTS_PROVIDER || 'gemini', // 'gemini' (dùng chung khoá) hoặc 'azure'
    model: process.env.TTS_MODEL || 'gemini-3.8-flash-lite-tts',
    voice: process.env.TTS_VOICE || 'Orus',
    azureKey: process.env.AZURE_SPEECH_KEY || '',
    azureRegion: process.env.AZURE_SPEECH_REGION || 'southeastasia',
    azureVoice: process.env.AZURE_SPEECH_VOICE || 'vi-VN-NamMinhNeural',
  },
  rate: {
    windowMs: num(process.env.RATE_WINDOW_MS, 10 * 60 * 1000),
    max: num(process.env.RATE_MAX, 60),
  },
  limits: {
    maxInputChars: 300, // FR-CHAT-04
    maxHistoryTurns: 6, // chiến lược chi phí 11.4
    maxOutputChars: 900,
    llmTimeoutMs: 20000, // FR-CHAT-12
    ttsTimeoutMs: 25000,
  },
};

// Chế độ chạy: có khóa Gemini -> AI trực tuyến; không có -> demo offline miễn phí
export const mode = () => (config.geminiKey ? 'gemini' : 'mock');
