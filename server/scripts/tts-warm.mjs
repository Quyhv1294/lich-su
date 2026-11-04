// Tạo sẵn file âm thanh cho lời chào của các tướng: npm run tts:warm -w server
// File nằm trong server/.cache/tts, khi gọi điện server dùng lại ngay nên không phải chờ.
// Chạy lại được nhiều lần: câu nào đã có thì bỏ qua. Đổi TTS_VOICE thì chạy lại để tạo giọng mới.
import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { synthesize, ttsAvailable } from '../src/services/tts.js';
import { checkOutput } from '../src/services/guardrail.js';

if (!ttsAvailable()) {
  console.error('Chưa cấu hình giọng đọc (GEMINI_API_KEY trong server/.env)');
  process.exit(1);
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/data/characters');
// Cắt câu giống hệt trình duyệt (splitSentences) để khoá lưu đệm khớp từng chữ
const split = (t) => t.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);

let ok = 0;
let failed = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const c = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
  for (const sentence of split(c.greeting || '')) {
    const text = checkOutput(sentence).text.slice(0, 400);
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        await synthesize(text);
        done = true;
      } catch (e) {
        console.log(`  thử lại ${attempt}/3 (${e.message})`);
        await new Promise((r) => setTimeout(r, 4000 * attempt));
      }
    }
    done ? ok++ : failed++;
    console.log(`${done ? 'OK ' : 'LỖI'} ${c.id || file}: ${text.slice(0, 50)}…`);
  }
}
console.log(`Xong: ${ok} câu thành công, ${failed} câu lỗi.`);
process.exit(failed ? 1 : 0);
