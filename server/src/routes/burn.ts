import { Router, Response } from 'express';
import { getDatabase } from '../models/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const BURNED_CONTENT = '悲伤往事，没入尘烟，万载空悠，徒留悲伤';
const MEMORIAL_COMMENT = '曾经来过的足迹，已入尘烟！';

interface StoryRow {
  id: number;
  user_id: number | null;
  title: string;
  content: string;
  metadata: string | null;
  created_at: string;
}

interface BurnedRow {
  id: number;
  story_id: number;
  burned_at: string;
}

router.post('/stories/:id/burn', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();

  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as StoryRow | undefined;
  if (!story) {
    res.status(404).json({ error: 'Story not found' });
    return;
  }

  if (story.user_id !== req.userId) {
    res.status(403).json({ error: 'You can only burn your own stories' });
    return;
  }

  const existingBurned = db.prepare('SELECT id FROM burned_stories WHERE story_id = ?').get(id);
  if (existingBurned) {
    res.status(400).json({ error: 'Story already burned' });
    return;
  }

  // All burn operations run in a single transaction — partial failure leaves no inconsistent state
  db.transaction(() => {
    db.prepare('UPDATE stories SET content = ? WHERE id = ?').run(BURNED_CONTENT, id);
    db.prepare('INSERT INTO burned_stories (story_id) VALUES (?)').run(id);

    // Keep only the first comment, overwrite it with the memorial text
    db.prepare(
      'DELETE FROM comments WHERE story_id = ? AND id NOT IN (SELECT id FROM comments WHERE story_id = ? ORDER BY created_at ASC LIMIT 1)'
    ).run(id, id);

    const remaining = db.prepare('SELECT id FROM comments WHERE story_id = ?').all(id) as { id: number }[];

    if (remaining.length > 0) {
      db.prepare('UPDATE comments SET content = ?, author_name = ?, is_hidden = 0 WHERE id = ?')
        .run(MEMORIAL_COMMENT, '岁月', remaining[0].id);
    } else {
      // No prior comments — insert the memorial comment
      db.prepare("INSERT INTO comments (story_id, author_name, content) VALUES (?, '岁月', ?)")
        .run(id, MEMORIAL_COMMENT);
    }
  })();

  const burnedStory = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as StoryRow | undefined;
  const burnedRecord = db.prepare('SELECT * FROM burned_stories WHERE story_id = ?').get(id) as BurnedRow | undefined;

  res.json({
    data: {
      ...burnedStory,
      isBurned: true,
      burnedAt: burnedRecord?.burned_at,
    },
  });
});

export default router;
