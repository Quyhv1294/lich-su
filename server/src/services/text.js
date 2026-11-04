/** Chuẩn hóa tiếng Việt: bỏ dấu, chữ thường, bỏ ký tự đặc biệt. */
export function normalize(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set([
  'la', 'cua', 'va', 'co', 'khong', 'nhu', 'the', 'nao', 'gi', 'ngai', 'ong', 'toi', 'ta', 'em',
  'thi', 'da', 'duoc', 'cho', 'o', 'tai', 'sao', 'vi', 'sao', 'nay', 'kia', 'nhung', 'mot', 'cac',
  'ban', 'minh', 'hay', 'voi', 'trong', 'khi', 'ai', 'bao', 'nhieu',
  'nhat', 'thich', 'muon', 'lam', 'biet', 'noi', 'nghe', 'xin', 'hoi', 'cau', 'dieu', 'nua', 'roi', 'dang',
]);

export function tokens(s) {
  return normalize(s).split(' ').filter((t) => t.length > 2 && !STOP.has(t));
}

/** Cắt văn bản thành các câu để phụ đề và đọc từng câu. */
export function splitSentences(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
