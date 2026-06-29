import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { dbGet, dbAll, dbRun } from '../models/database.js';

const router = Router();

// Send a message
router.post('/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  const fromId = req.userId as number;
  const { toUserId, content } = req.body;
  if (!toUserId || !content?.trim()) { res.status(400).json({ error: 'toUserId and content are required' }); return; }
  if (fromId === toUserId) { res.status(400).json({ error: 'Cannot message yourself' }); return; }

  // Check if sender is blocked by receiver
  const blocked = await dbGet(
    'SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
    [toUserId, fromId]
  );
  if (blocked) {
    res.status(403).json({ error: '对方已将你拉黑，无法发送私信', code: 'blocked' });
    return;
  }

  const toUser = await dbGet('SELECT id FROM users WHERE id = ?', [toUserId]);
  if (!toUser) { res.status(404).json({ error: 'User not found' }); return; }

  const result = await dbRun(
    'INSERT INTO messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)',
    [fromId, toUserId, content.trim()]
  );

  // Create notification for receiver
  await dbRun(
    'INSERT INTO notifications (user_id, type, source_id, actor_id) VALUES (?, ?, ?, ?)',
    [toUserId, 'new_message', result.lastInsertRowid, fromId]
  );

  res.status(201).json({ data: { id: result.lastInsertRowid } });
});

// Get conversation list (latest message per user, grouped)
router.get('/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number;
  const list = await dbAll<any>(
    `SELECT u.id, u.nickname, u.avatar,
            (SELECT content FROM messages WHERE (from_user_id = m.from_user_id AND to_user_id = m.to_user_id) OR (from_user_id = m.to_user_id AND to_user_id = m.from_user_id) ORDER BY created_at DESC LIMIT 1) as last_content,
            (SELECT created_at FROM messages WHERE (from_user_id = m.from_user_id AND to_user_id = m.to_user_id) OR (from_user_id = m.to_user_id AND to_user_id = m.from_user_id) ORDER BY created_at DESC LIMIT 1) as last_time,
            (SELECT COUNT(*) FROM messages WHERE from_user_id = u.id AND to_user_id = ? AND is_read = 0) as unread
     FROM (SELECT DISTINCT CASE WHEN from_user_id = ? THEN to_user_id ELSE from_user_id END as other_id,
           from_user_id, to_user_id
           FROM messages WHERE from_user_id = ? OR to_user_id = ?) m
     JOIN users u ON u.id = m.other_id
     GROUP BY u.id ORDER BY last_time DESC`,
    [userId, userId, userId, userId]
  );
  res.json({ data: list });
});

// Get conversation with a specific user
router.get('/messages/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number;
  const otherId = parseInt(req.params.userId, 10);
  const limit = Math.min(50, parseInt(String(req.query.limit || '30'), 10));
  const before = parseInt(String(req.query.before || '0'), 10);

  // Check if blocked (either direction)
  const blocked = await dbGet(
    'SELECT id FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [userId, otherId, otherId, userId]
  );
  const isBlocked = !!blocked;

  let query = `SELECT m.*, uf.nickname as from_nickname, ut.nickname as to_nickname
               FROM messages m
               LEFT JOIN users uf ON m.from_user_id = uf.id
               LEFT JOIN users ut ON m.to_user_id = ut.id
               WHERE ((m.from_user_id = ? AND m.to_user_id = ?) OR (m.from_user_id = ? AND m.to_user_id = ?))`;
  const params: (number | string)[] = [userId, otherId, otherId, userId];
  if (before) { query += ' AND m.id < ?'; params.push(before); }
  query += ' ORDER BY m.created_at DESC LIMIT ?';
  params.push(limit);

  const messages = await dbAll<any>(query, params);
  res.json({ data: messages.reverse(), isBlocked });
});

// Mark messages from a specific user as read
router.post('/messages/:userId/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number;
  const fromId = parseInt(req.params.userId, 10);
  await dbRun('UPDATE messages SET is_read = 1 WHERE to_user_id = ? AND from_user_id = ? AND is_read = 0', [userId, fromId]);
  res.json({ ok: true });
});

export default router;
