import { Router, Response } from 'express';
import { dbGet, dbAll, dbRun, dbBatch } from '../models/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const BURNED_CONTENT = '悲伤往事，没入尘烟，万载空悠，徒留悲伤';
const MEMORIAL_COMMENT = '曾经来过的足迹，已入尘烟！';

router.post('/stories/:id/burn', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const story = await dbGet<{ id: number; user_id: number | null; title: string; content: string }>(
    'SELECT * FROM stories WHERE id = ?', [id]
  );
  if (!story) { res.status(404).json({ error: 'Story not found' }); return; }
  if (story.user_id !== req.userId) { res.status(403).json({ error: 'You can only burn your own stories' }); return; }

  const existingBurned = await dbGet('SELECT id FROM burned_stories WHERE story_id = ?', [id]);
  if (existingBurned) { res.status(400).json({ error: 'Story already burned' }); return; }

  // Delete all but the first comment
  await dbRun(
    'DELETE FROM comments WHERE story_id = ? AND id NOT IN (SELECT id FROM comments WHERE story_id = ? ORDER BY created_at ASC LIMIT 1)',
    [id, id]
  );

  const remaining = await dbAll<{ id: number }>('SELECT id FROM comments WHERE story_id = ?', [id]);

  // Execute burn atomically as a batch
  const stmts: { sql: string; args: unknown[] }[] = [
    { sql: 'UPDATE stories SET content = ? WHERE id = ?', args: [BURNED_CONTENT, id] },
    { sql: 'INSERT INTO burned_stories (story_id) VALUES (?)', args: [id] },
  ];

  if (remaining.length > 0) {
    stmts.push({
      sql: 'UPDATE comments SET content = ?, author_name = ?, is_hidden = 0 WHERE id = ?',
      args: [MEMORIAL_COMMENT, '岁月', remaining[0].id],
    });
  } else {
    stmts.push({
      sql: "INSERT INTO comments (story_id, author_name, content) VALUES (?, '岁月', ?)",
      args: [id, MEMORIAL_COMMENT],
    });
  }

  await dbBatch(stmts);

  const burnedStory = await dbGet('SELECT * FROM stories WHERE id = ?', [id]);
  const burnedRecord = await dbGet<{ burned_at: string }>('SELECT * FROM burned_stories WHERE story_id = ?', [id]);

  res.json({ data: { ...burnedStory, isBurned: true, burnedAt: burnedRecord?.burned_at } });
});

export default router;
