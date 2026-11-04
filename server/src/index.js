import { createApp } from './app.js';
import { config, mode } from './config.js';

createApp().listen(config.port, () => {
  console.log(`API chạy tại http://localhost:${config.port}  |  chế độ: ${mode() === 'gemini' ? `AI trực tuyến (${config.geminiModel})` : 'DEMO OFFLINE (không cần khóa API)'}`);
});
