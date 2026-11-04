import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

// Tạo file âm thanh cho từng câu (một giọng chung cho mọi nhân vật), có lưu đệm trên đĩa
// để câu đã đọc rồi không phải tạo lại. Hai nhà cung cấp: Gemini (dùng chung khoá) hoặc Azure.

const cacheDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.cache/tts');
const inflight = new Map();

export const ttsAvailable = () => (config.tts.provider === 'azure' ? !!config.tts.azureKey : !!config.geminiKey);

/** Bọc dữ liệu PCM 16-bit mono vào WAV để trình duyệt phát được. */
function pcmToWav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** Chỉnh âm lượng về một mức chung (RMS) để mọi câu trả lời to nhỏ như nhau; không để méo tiếng. */
function normalizePcm(pcm, target = 5000) {
  const n = pcm.length >> 1;
  if (!n) return pcm;
  let sum = 0;
  let peak = 1;
  for (let i = 0; i < n; i++) {
    const v = pcm.readInt16LE(i * 2);
    sum += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  const rms = Math.sqrt(sum / n) || 1;
  const gain = Math.min(target / rms, 32000 / peak, 3);
  if (Math.abs(gain - 1) < 0.03) return pcm;
  const out = Buffer.alloc(pcm.length);
  for (let i = 0; i < n; i++) out.writeInt16LE(Math.round(pcm.readInt16LE(i * 2) * gain), i * 2);
  return out;
}

/** Chỉnh âm lượng phần dữ liệu của file WAV 16-bit, giữ nguyên phần đầu file. */
function normalizeWav(wav) {
  const at = wav.indexOf('data', 12, 'latin1');
  if (at < 0 || wav.readUInt16LE(34) !== 16) return wav;
  const start = at + 8;
  return Buffer.concat([wav.subarray(0, start), normalizePcm(wav.subarray(start))]);
}

export async function geminiSpeech(text, signal, voice = config.tts.voice) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.tts.model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
    // Không thêm lời chỉ dẫn kiểu "đọc bằng giọng…" vào văn bản: mô hình sẽ đọc to luôn cả lời chỉ dẫn.
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Gemini TTS HTTP ${res.status}`);
  const part = (await res.json())?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error('Gemini TTS không trả về âm thanh');
  const data = Buffer.from(part.inlineData.data, 'base64');
  const mime = part.inlineData.mimeType || '';
  if (/wav/i.test(mime)) return { buffer: normalizeWav(data), mime: 'audio/wav' };
  const rate = Number(/rate=(\d+)/i.exec(mime)?.[1]) || 24000;
  return { buffer: pcmToWav(normalizePcm(data), rate), mime: 'audio/wav' };
}

const ESC = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
const xmlEscape = (s) => s.replace(/[<>&'"]/g, (c) => ESC[c]);

async function azureSpeech(text, signal) {
  const { azureKey, azureRegion, azureVoice } = config.tts;
  const ssml = `<speak version="1.0" xml:lang="vi-VN"><voice name="${azureVoice}"><prosody rate="-5%">${xmlEscape(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': azureKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'than-tuong-ke-chuyen',
    },
    body: ssml,
    signal,
  });
  if (!res.ok) throw new Error(`Azure TTS HTTP ${res.status}`);
  return { buffer: Buffer.from(await res.arrayBuffer()), mime: 'audio/mpeg' };
}

/** @returns {Promise<{buffer: Buffer, mime: string}>} */
export async function synthesize(text) {
  const p = config.tts;
  const id = createHash('sha256').update(`${p.provider}|${p.model}|${p.voice}|${p.azureVoice}|${text}`).digest('hex').slice(0, 40);
  const isMp3 = p.provider === 'azure';
  const file = path.join(cacheDir, `${id}.${isMp3 ? 'mp3' : 'wav'}`);
  const mime = isMp3 ? 'audio/mpeg' : 'audio/wav';
  if (existsSync(file)) return { buffer: readFileSync(file), mime };

  if (!inflight.has(id)) {
    const job = (async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), config.limits.ttsTimeoutMs);
      try {
        const out = await (isMp3 ? azureSpeech(text, ctrl.signal) : geminiSpeech(text, ctrl.signal));
        mkdirSync(cacheDir, { recursive: true });
        writeFileSync(file, out.buffer);
        return out;
      } finally {
        clearTimeout(timer);
        inflight.delete(id);
      }
    })();
    inflight.set(id, job);
  }
  return inflight.get(id);
}
