import { Router } from 'express';
import { listCharacters, getPublicCharacter } from '../services/characterStore.js';

const router = Router();

// GET /api/characters
router.get('/', (_req, res) => res.json({ characters: listCharacters() }));

// GET /api/characters/:slug
router.get('/:slug', (req, res) => {
  const c = getPublicCharacter(req.params.slug);
  if (!c) return res.status(404).json({ code: 'NOT_FOUND', message: 'Không tìm thấy nhân vật' });
  res.json(c);
});

export default router;
