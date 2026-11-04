// Sinh ảnh chân dung minh hoạ (SVG) cho 6 nhân vật. Đây là ảnh TẠM của bản demo.
// Bản sản xuất thay bằng ảnh do AI tạo và đã được duyệt (UC-35, BR-08).
//   node scripts/generate-avatars.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'server/src/data/characters');
const outDir = path.join(root, 'client/public/characters');
mkdirSync(outDir, { recursive: true });

const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt)).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
};

// Mỗi nhân vật: màu áo, mũ/khăn, râu, tuổi (tỉ lệ khuôn mặt)
const LOOKS = {
  'ngo-quyen':      { robe: '#5b2a1c', hat: 'crown',   beard: 'short', young: false },
  'ly-thuong-kiet': { robe: '#274b57', hat: 'helmet',  beard: 'none',  young: false },
  'tran-hung-dao':  { robe: '#3a2f5b', hat: 'plume',   beard: 'long',  young: false },
  'le-loi':         { robe: '#31472d', hat: 'turban',  beard: 'long',  young: false },
  'tran-quoc-toan': { robe: '#7a3b22', hat: 'topknot', beard: 'none',  young: true },
  'quang-trung':    { robe: '#7b1d1d', hat: 'redcap',  beard: 'short', young: false },
};

function hat(kind, accent) {
  const dark = shade(accent, -60);
  switch (kind) {
    case 'crown':
      return `<path d="M128 150 L140 98 H260 L272 150 Z" fill="#2b2118"/>
              <rect x="124" y="142" width="152" height="14" rx="4" fill="#b88a2e"/>
              <path d="M140 98 L130 82 M260 98 L270 82" stroke="#2b2118" stroke-width="10" stroke-linecap="round"/>
              <circle cx="200" cy="120" r="9" fill="#b88a2e"/>`;
    case 'helmet':
      return `<path d="M128 156 C128 96 160 78 200 78 C240 78 272 96 272 156 Z" fill="#8e9aa0"/>
              <path d="M128 156 H272" stroke="#4a5559" stroke-width="10"/>
              <path d="M200 78 V60" stroke="#4a5559" stroke-width="8" stroke-linecap="round"/>
              <path d="M200 64 C214 52 222 40 214 26 C208 40 196 48 200 64Z" fill="${accent}"/>`;
    case 'plume':
      return `<path d="M126 158 C126 94 160 74 200 74 C240 74 274 94 274 158 Z" fill="#b88a2e"/>
              <path d="M126 158 H274" stroke="#7a5a14" stroke-width="10"/>
              <path d="M200 74 V40" stroke="#7a5a14" stroke-width="8" stroke-linecap="round"/>
              <path d="M200 44 C232 34 244 12 232 -2 C226 18 204 28 200 44Z" fill="#c43b24"/>`;
    case 'turban':
      return `<path d="M126 150 C122 100 160 84 200 84 C240 84 278 100 274 150 C250 134 150 134 126 150Z" fill="#e8dcc0"/>
              <path d="M134 128 C170 114 230 114 266 128 M140 112 C175 100 225 100 260 112" stroke="#b8a780" stroke-width="5" fill="none"/>`;
    case 'topknot':
      return `<path d="M132 150 C132 104 162 90 200 90 C238 90 268 104 268 150 C240 132 160 132 132 150Z" fill="#2b2118"/>
              <circle cx="200" cy="80" r="16" fill="#2b2118"/>
              <rect x="126" y="130" width="148" height="12" rx="6" fill="${accent}"/>`;
    case 'redcap':
    default:
      return `<path d="M126 150 C126 98 160 80 200 80 C240 80 274 98 274 150 C250 136 150 136 126 150Z" fill="#c43b24"/>
              <rect x="124" y="140" width="152" height="14" rx="6" fill="#b88a2e"/>
              <path d="M250 96 C270 78 290 70 300 84 C284 86 270 98 262 112Z" fill="${dark}"/>`;
  }
}

function beard(kind) {
  if (kind === 'long') return '<path d="M156 214 C158 276 180 296 200 300 C220 296 242 276 244 214 C228 240 172 240 156 214Z" fill="#d8d3c8"/>';
  if (kind === 'short') return '<path d="M160 218 C166 254 184 264 200 264 C216 264 234 254 240 218 C226 236 174 236 160 218Z" fill="#2b2118"/>';
  return '';
}

function svg(c) {
  const look = LOOKS[c.id] || LOOKS['ngo-quyen'];
  const bg = c.accent;
  const faceY = look.young ? 196 : 190;
  const faceRy = look.young ? 64 : 70;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" role="img" aria-labelledby="t">
  <title id="t">Ảnh minh hoạ ${c.name} (ảnh tạm của bản demo)</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(bg, 28)}"/><stop offset="1" stop-color="${shade(bg, -42)}"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".38" r=".6">
      <stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="480" fill="url(#bg)"/>
  <rect width="400" height="480" fill="url(#glow)"/>
  <g opacity=".12" fill="#fff"><circle cx="200" cy="215" r="170"/><circle cx="200" cy="215" r="125"/></g>
  <!-- thân áo -->
  <path d="M40 480 C48 372 112 316 200 316 C288 316 352 372 360 480Z" fill="${look.robe}"/>
  <path d="M200 316 L160 480 M200 316 L240 480" stroke="${shade(look.robe, 40)}" stroke-width="6" fill="none"/>
  <path d="M158 316 C170 346 230 346 242 316 L242 300 H158Z" fill="${shade(look.robe, -20)}"/>
  <!-- cổ + mặt -->
  <rect x="176" y="262" width="48" height="56" rx="14" fill="#d9ad84"/>
  <ellipse cx="200" cy="${faceY}" rx="${look.young ? 58 : 62}" ry="${faceRy}" fill="#e6bd94"/>
  ${beard(look.beard)}
  <!-- nét mặt -->
  <g fill="#2b2118">
    <ellipse cx="177" cy="${faceY - 6}" rx="5" ry="${look.young ? 7 : 5}"/>
    <ellipse cx="223" cy="${faceY - 6}" rx="5" ry="${look.young ? 7 : 5}"/>
  </g>
  <path d="M164 ${faceY - 22} q13 -8 26 0 M210 ${faceY - 22} q13 -8 26 0" stroke="#2b2118" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M200 ${faceY} v22" stroke="#b98a62" stroke-width="4" stroke-linecap="round"/>
  <path d="M184 ${faceY + 38} q16 ${look.young ? 12 : 7} 32 0" stroke="#7a3b22" stroke-width="4" fill="none" stroke-linecap="round"/>
  ${hat(look.hat, c.accent)}
  <!-- nhãn ảnh tạm -->
  <rect x="104" y="440" width="192" height="26" rx="13" fill="#2b2118" opacity=".78"/>
  <text x="200" y="458" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="13" fill="#f6efe0">Ảnh minh hoạ · bản demo</text>
</svg>
`;
}

let n = 0;
for (const f of readdirSync(dataDir).filter((x) => x.endsWith('.json'))) {
  const c = JSON.parse(readFileSync(path.join(dataDir, f), 'utf8'));
  writeFileSync(path.join(outDir, `${c.slug}.svg`), svg(c));
  n += 1;
}
console.log(`Đã tạo ${n} ảnh minh hoạ trong client/public/characters/`);
