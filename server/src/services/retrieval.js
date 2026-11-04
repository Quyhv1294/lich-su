import { normalize, tokens } from './text.js';

/**
 * Truy xuất đơn giản (từ khóa) trên kho tri thức của MỘT nhân vật (AI-02).
 * Bản sản xuất thay bằng embedding + kho vector (SRS mục 10); giao diện hàm giữ nguyên.
 */
export function buildChunks(character) {
  const chunks = [];
  character.faq.forEach((f, i) => {
    chunks.push({
      id: `faq-${i}`,
      type: 'faq',
      text: f.a,
      question: f.q,
      keywords: f.keywords || [],
      followUps: f.followUps || [],
    });
  });
  character.events.forEach((e) => {
    chunks.push({ id: `event-${e.id}`, type: 'event', text: `${e.title} (${e.year}): ${e.summary}`, keywords: [] });
  });
  const p = character.profile;
  [['biography', 'Tiểu sử'], ['career', 'Sự nghiệp'], ['thought', 'Tư tưởng'], ['works', 'Tác phẩm']].forEach(([k, label]) => {
    if (p[k]) chunks.push({ id: `profile-${k}`, type: 'profile', text: `${label}: ${p[k]}`, keywords: [] });
  });
  return chunks;
}

function score(chunk, qNorm, qTokens) {
  let s = 0;
  const padded = ` ${qNorm} `;
  for (const kw of chunk.keywords) {
    // So khớp theo ranh giới từ để "ai" không khớp nhầm trong "ngai"
    if (padded.includes(` ${normalize(kw)} `)) s += 3;
  }
  const hay = new Set(tokens(`${chunk.question || ''} ${chunk.text}`));
  for (const t of qTokens) if (hay.has(t)) s += 1;
  if (chunk.question && normalize(chunk.question) === qNorm) s += 10;
  return s;
}

export function retrieve(character, query, k = 4, minScore = 3) {
  const qNorm = normalize(query);
  const qTokens = tokens(query);
  return buildChunks(character)
    .map((c) => ({ ...c, score: score(c, qNorm, qTokens) }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
