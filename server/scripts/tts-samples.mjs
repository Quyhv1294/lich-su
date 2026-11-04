// Tạo file nghe thử các giọng nam của Gemini TTS: npm run tts:samples -w server
// Kết quả nằm trong server/.cache/tts-samples/ — mở từng file để chọn giọng, rồi đặt TTS_VOICE trong server/.env.
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geminiSpeech } from '../src/services/tts.js';
import { config } from '../src/config.js';

if (!config.geminiKey) {
  console.error('Chưa có GEMINI_API_KEY trong server/.env');
  process.exit(1);
}

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '../.cache/tts-samples');
mkdirSync(out, { recursive: true });

const text = 'Ta là Trần Quốc Tuấn, người đời gọi là Hưng Đạo Vương. Năm một nghìn hai trăm tám mươi tám, ta cho đóng cọc nhọn dưới lòng sông Bạch Đằng.';
const voices = ['Orus', 'Alnilam', 'Gacrux', 'Charon', 'Fenrir', 'Algieba', 'Rasalgethi', 'Sadaltager'];

for (const voice of voices) {
  try {
    const { buffer } = await geminiSpeech(text, AbortSignal.timeout(30000), voice);
    const file = path.join(out, `${voice}.wav`);
    writeFileSync(file, buffer);
    console.log(`${voice}: ${file}`);
  } catch (e) {
    console.log(`${voice}: lỗi (${e.message})`);
  }
}
