import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/characters');

const ORDER = ['ngo-quyen', 'ly-thuong-kiet', 'tran-hung-dao', 'le-loi', 'tran-quoc-toan', 'quang-trung'];

const characters = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')))
  .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

const bySlug = new Map(characters.map((c) => [c.slug, c]));

/** Bản tóm tắt cho danh sách nhân vật (SCR-02). */
export function listCharacters() {
  return characters.map(({ id, slug, name, title, era, grades, tagline, accent, avatar }) => ({
    id, slug, name, title, era, grades, tagline, accent, avatar,
  }));
}

export function getCharacter(slug) {
  return bySlug.get(slug) || null;
}

/** Dữ liệu công khai của một nhân vật (không lộ persona prompt và FAQ nội bộ). */
export function getPublicCharacter(slug) {
  const c = bySlug.get(slug);
  if (!c) return null;
  const { persona, faq, events, ...rest } = c; // eslint-disable-line no-unused-vars
  return {
    ...rest,
    events: events.map(({ id, title, year, grade, summary }) => ({ id, title, year, grade, summary })),
  };
}

export function getEvent(slug, eventId) {
  const c = bySlug.get(slug);
  return c?.events.find((e) => e.id === eventId) || null;
}
