import { Router } from 'express';

const router = Router();
const REASONS = ['helpful', 'not_helpful', 'wrong_fact', 'off_character', 'hard_to_understand', 'inappropriate'];

// POST /api/feedback { characterId, rating: 'up'|'down', reason?, note? }
// Demo: chỉ ghi log ẩn danh. Bản sản xuất lưu CSDL và đưa vào hàng chờ kiểm duyệt (UC-36).
router.post('/', (req, res) => {
  const { characterId, rating, reason, note } = req.body ?? {};
  if (!['up', 'down'].includes(rating)) return res.status(400).json({ code: 'INVALID_INPUT', message: 'rating không hợp lệ' });
  console.log(JSON.stringify({
    at: new Date().toISOString(), type: 'feedback', characterId, rating,
    reason: REASONS.includes(reason) ? reason : undefined,
    note: typeof note === 'string' ? note.slice(0, 200) : undefined,
  }));
  res.status(204).end();
});

export default router;
