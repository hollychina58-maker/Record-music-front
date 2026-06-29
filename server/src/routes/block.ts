import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { dbGet, dbRun } from '../models/database.js';

const router = Router();

// Block / unblock a user
router.post('/users/:id/block', authMiddleware, async (req: AuthRequest, res: Response) => {
  const blockerId = req.userId as number;
  const blockedId = parseInt(req.params.id, 10);
  if (blockerId === blockedId) { res.status(400).json({ error: 'Cannot block yourself' }); return; }

  const user = await dbGet('SELECT id FROM users WHERE id = ?', [blockedId]);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const existing = await dbGet('SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?', [blockerId, blockedId]);
  if (existing) {
    await dbRun('DELETE FROM blocked_users WHERE id = ?', [existing.id]);
    res.json({ blocked: false });
  } else {
    await dbRun('INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)', [blockerId, blockedId]);
    res.json({ blocked: true });
  }
});

// Check if blocked
router.get('/users/:id/is-blocked', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number;
  const otherId = parseInt(req.params.id, 10);
  const row = await dbGet('SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?', [userId, otherId]);
  res.json({ blocked: !!row });
});

export default router;
