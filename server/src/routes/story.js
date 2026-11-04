import { Router } from 'express';
import { getCharacter, getEvent } from '../services/characterStore.js';
import { splitSentences } from '../services/text.js';

const router = Router();

// POST /api/story { characterId, eventId }
// Bản demo phục vụ bản kể đã soạn sẵn (BR-10). Bản sản xuất: chỉ phục vụ bản đã thẩm định.
router.post('/', (req, res) => {
  const { characterId, eventId } = req.body ?? {};
  const character = getCharacter(characterId);
  if (!character) return res.status(404).json({ code: 'NOT_FOUND', message: 'Không tìm thấy nhân vật' });
  const event = getEvent(characterId, eventId);
  if (!event) return res.status(404).json({ code: 'NOT_FOUND', message: 'Không tìm thấy sự kiện' });

  res.json({
    eventId: event.id,
    title: event.title,
    year: event.year,
    text: event.story,
    sentences: splitSentences(event.story),
    reviewed: false, // demo: chưa qua thẩm định của chuyên gia (UC-34)
    voice: character.voice,
  });
});

export default router;
