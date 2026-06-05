import { dbGet, dbRun } from '../models/database.js';
import { generateMusic } from './minimax.js';

const DEFAULT_STORY = {
  title: '墨韵初章',
  content: `墨池之畔，烟霭氤氲。

那一方古砚，静卧于案，砚池中余墨未干，映着窗棂外斜照的暮光，幽幽如深潭。执笔之人端坐，指节苍劲，提腕间，一管紫毫饱蘸浓墨，落于素宣之上。

笔锋乍落，如孤鸿踏雪，轻而决绝。墨痕晕开，仿佛千年前某位无名书生的叹息，穿透了时光的帷幕，在这一刻被重新唤醒。横如千里阵云，竖如万岁枯藤——每一笔，都是山水的魂魄，是风骨与血肉的交织。

墨有魂魄。浓处是山河沈寂，淡处是烟雨迷离；枯笔见风骨嶙峋，湿墨蕴温润如玉。研墨之人深知，这黑不只是黑，是万物归于一心后的澄明。它在宣纸上呼吸、生长、蔓延，终而凝结成一方独立于时间之外的小宇宙。

风入轩窗，吹动案头残卷，沙沙声如远古的回响。执笔者搁笔，凝视着纸上的墨迹——它不言，却已说尽了一切。`,
  language: 'cmn',
  country_code: 'CN',
};

export async function seedDefaultStory(): Promise<void> {
  const existing = await dbGet('SELECT id FROM stories WHERE user_id IS NULL LIMIT 1');
  if (existing) {
    console.log('[Seed] Default story already exists');
    return;
  }

  const storyResult = await dbRun(
    'INSERT INTO stories (user_id, title, content, language, country_code) VALUES (NULL, ?, ?, ?, ?)',
    [DEFAULT_STORY.title, DEFAULT_STORY.content, DEFAULT_STORY.language, DEFAULT_STORY.country_code]
  );
  const storyId = storyResult.lastInsertRowid;

  const musicResult = await dbRun(
    "INSERT INTO music (story_id, status, style) VALUES (?, 'pending', '辽阔悠扬')",
    [storyId]
  );
  const musicId = musicResult.lastInsertRowid;

  console.log(`[Seed] Default story created (id: ${storyId}), music record (id: ${musicId})`);

  if (!process.env.MINIMAX_API_KEY) {
    console.log('[Seed] MiniMax API key not configured — skipping music generation');
    return;
  }

  try {
    console.log('[Seed] Generating music for default story...');
    const { audioUrl } = await generateMusic(DEFAULT_STORY.content, {
      musicType: 'instrumental',
      musicMood: 'peace',
      musicGenre: 'chinese_folk',
    });
    await dbRun(
      "UPDATE music SET status = 'completed', file_path = ? WHERE id = ?",
      [audioUrl, musicId]
    );
    console.log('[Seed] Music generated and saved');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.warn(`[Seed] Music generation failed: ${message} — music will remain pending`);
  }
}
