#!/usr/bin/env node
/**
 * SessionEnd Hook — 将会话摘要同步到 Obsidian 库
 *
 * 写入位置: d:/dragon-Knowlege/MyClaudeMemo/Record-App/sessions/
 * 文件命名: YYYY-MM-DD-<session-id>.md
 *
 * 环境变量 (由 Claude Code 提供):
 *   CLAUDE_SESSION_ID    — 会话 ID
 *   CLAUDE_STOP_REASON   — 停止原因 (user_interrupt / max_turns / error)
 *   CLAUDE_TRANSCRIPT    — 对话记录路径
 *   CLAUDE_CWD           — 项目工作目录
 */

const fs = require('fs');
const path = require('path');

const OBSIDIAN_VAULT = 'd:/dragon-Knowlege/MyClaudeMemo';
const PROJECT = 'Record-App';
const SESSIONS_DIR = path.join(OBSIDIAN_VAULT, PROJECT, 'sessions');

// 确保目录存在
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';
const stopReason = process.env.CLAUDE_STOP_REASON || 'unknown';
const transcriptPath = process.env.CLAUDE_TRANSCRIPT || '';
const cwd = process.env.CLAUDE_CWD || process.cwd();

// 读取 transcript 最后 200 行来提取摘要
let lastMessage = '';
let messageCount = 0;
let userMessages = [];
if (transcriptPath && fs.existsSync(transcriptPath)) {
  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    messageCount = lines.filter(l => l.includes('"role":"user"') || l.includes('"role":"assistant"')).length;

    // 提取最后几行有意义的内容
    const recent = lines.slice(-50);
    lastMessage = recent
      .filter(l => l.includes('"text":"'))
      .slice(-3)
      .map(l => {
        try {
          const j = JSON.parse(l);
          return (j.text || '').substring(0, 200);
        } catch { return ''; }
      })
      .filter(Boolean)
      .join('\n...\n');
  } catch (e) {
    lastMessage = '(无法读取对话记录)';
  }
}

const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const timeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
const shortId = sessionId.substring(0, 8);

const filename = `${dateStr}-${shortId}.md`;
const filepath = path.join(SESSIONS_DIR, filename);

const content = `---
tags:
  - session
  - Record-App
date: ${dateStr}
session_id: ${sessionId}
stop_reason: ${stopReason}
---

# 会话记录 — ${timeStr}

## 基本信息

| 项目 | 值 |
|------|-----|
| 日期 | ${dateStr} |
| 时间 | ${timeStr} |
| 会话 ID | ${sessionId} |
| 停止原因 | ${stopReason} |
| 消息数 (约) | ${messageCount} |
| 工作目录 | ${cwd} |

## 对话摘要

> 此文件由 SessionEnd hook 自动生成。请手动补充摘要和关键决策。

${lastMessage ? '### 最后对话片段\n\n```\n' + lastMessage + '\n```\n' : ''}

## 关键决策

<!-- 请在此记录本次会话中的重要决策 -->

## 修改的文件

<!-- 请在此列出本次会话中修改的文件 -->

## 用户反馈

<!-- 请在此记录用户的反馈和偏好 -->

## 待办事项

<!-- 会话结束时尚未完成的事项 -->

## 关联笔记

- [[../00-项目概览]]
- [[../01-架构与技术栈]]
`;

fs.writeFileSync(filepath, content, 'utf-8');
console.log(`✅ 会话记录已同步至 Obsidian: ${filepath}`);
`;

// 也更新会话索引
const indexPath = path.join(OBSIDIAN_VAULT, PROJECT, 'sessions', 'INDEX.md');
let indexContent = '';
if (fs.existsSync(indexPath)) {
  indexContent = fs.readFileSync(indexPath, 'utf-8');
} else {
  indexContent = `---
tags:
  - index
  - sessions
  - Record-App
---

# 会话索引

| 日期 | 时间 | 会话 ID | 摘要 |
|------|------|---------|------|\n`;
}

// 追加新条目
const entry = `| ${dateStr} | ${timeStr} | ${shortId} | (待填写) |\n`;
indexContent += entry;
fs.writeFileSync(indexPath, indexContent, 'utf-8');
console.log(`✅ 会话索引已更新: ${indexPath}`);
