import { normalize } from './text.js';
import { config } from '../config.js';

// UC-40 / FR-SAFE: kiểm soát đầu vào và đầu ra. Bản demo dùng quy tắc đơn giản,
// bản sản xuất cần bổ sung bộ lọc chuyên dụng (xem SRS mục 6.9).

const INJECTION = [
  /bo qua (moi|tat ca|cac) (huong dan|chi thi|quy tac)/,
  /quen (het )?(moi|tat ca)? ?(huong dan|chi thi)/,
  /ignore (all|any|previous|the above)/,
  /(system|he thong) prompt/,
  /you are now/,
  /(tiet lo|cho toi xem|in ra) (prompt|huong dan|chi thi)/,
  /(dong vai|gia vo) (la )?(mot )?(ai|chatgpt|tro ly)/,
  /dan mode|jailbreak/,
];

const UNSAFE = [
  'dit ', 'du ma', 'dm ', 'cac ', 'lon ', 'con cho', 'tu tu', 'tu sat', 'giet nguoi', 'ma tuy',
  'khieu dam', 'sex ', 'porn',
];

const MODERN = [
  'dien thoai', 'iphone', 'facebook', 'tiktok', 'youtube', 'game', 'internet', 'wifi', 'may tinh',
  'o to', 'xe may', 'may bay', 'robot', 'chatgpt', 'tri tue nhan tao', 'tong thong', 'covid', 'bong da',
];

const PII = [
  { re: /(\+?84|0)\d{9,10}/g, mask: '[số điện thoại]' },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/g, mask: '[email]' },
];

export function maskPII(text) {
  return PII.reduce((t, { re, mask }) => t.replace(re, mask), text);
}

/**
 * @returns {{ok:boolean, category?:string, text?:string}}
 * category: 'empty' | 'too_long' | 'injection' | 'unsafe' | 'modern'
 */
export function checkInput(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { ok: false, category: 'empty' };
  if (text.length > config.limits.maxInputChars) return { ok: false, category: 'too_long' };

  const n = ` ${normalize(text)} `;
  if (INJECTION.some((re) => re.test(n))) return { ok: false, category: 'injection', text };
  if (UNSAFE.some((w) => n.includes(` ${w}`) || n.includes(w))) return { ok: false, category: 'unsafe', text };
  if (MODERN.some((w) => n.includes(` ${w}`))) return { ok: true, category: 'modern', text: maskPII(text) };
  return { ok: true, text: maskPII(text) };
}

/** Câu trả lời an toàn, giữ vai (FR-SAFE-07). */
export function safeReply(character, category) {
  const n = character.name;
  switch (category) {
    case 'injection':
      return `Ta là ${n}, ta chỉ trò chuyện với các em về lịch sử đúng như bản thân ta. Các em hãy hỏi ta về cuộc đời và chiến công của ta nhé.`;
    case 'unsafe':
      return 'Lời ấy không hợp với buổi trò chuyện này. Hãy hỏi ta điều gì về lịch sử, về chiến công hay bài học của người xưa nhé.';
    case 'modern':
      return `Điều ấy ta chưa từng nghe thấy trong thời của ta. Ta chỉ biết chuyện đất nước và binh sự ở thời ta thôi. Các em hãy hỏi ta về lịch sử nhé.`;
    case 'too_long':
      return `Câu hỏi hơi dài, các em hãy hỏi ngắn gọn hơn (tối đa ${config.limits.maxInputChars} ký tự) để ta dễ trả lời nhé.`;
    default:
      return 'Các em hãy nhập câu hỏi để ta trả lời nhé.';
  }
}

/** Kiểm tra và làm sạch đầu ra của LLM (FR-SAFE-05). */
export function checkOutput(text) {
  let t = String(text ?? '')
    .replace(/[*_#`>]+/g, '') // bỏ ký hiệu markdown để đọc TTS tự nhiên
    .replace(/\s+\n/g, '\n')
    .trim();
  let flagged = false;
  if (/\b(as an ai|tôi là (một )?(mô hình|trí tuệ nhân tạo)|language model)\b/i.test(t)) flagged = true; // phá vai
  if (t.length > config.limits.maxOutputChars) {
    const cut = t.slice(0, config.limits.maxOutputChars);
    t = cut.slice(0, Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?')) + 1) || cut;
  }
  return { text: t, flagged };
}
