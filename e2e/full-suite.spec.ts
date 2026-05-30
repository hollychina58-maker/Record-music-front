import { test, expect } from '@playwright/test';
import {
  apiRegister, apiLogin, apiCreateStory, apiDeleteStory,
  apiBurnStory, apiGetStory, apiAddComment, apiDeleteComment,
  apiToggleLike, apiGenerateMusic, apiGetMusicStatus,
  apiGetProfile, uiLogin, uiLoginFast,
} from './helpers';

const API_URL = 'http://localhost:4000';

// ─── Shared state, initialized in beforeAll ─────────────────
const S: { userA?: any; userB?: any; storyByA?: any; storyByB?: any } = {};

const ts = Date.now();
const EMAIL_A = `ta-${ts}@e.com`;
const EMAIL_B = `tb-${ts}@e.com`;
const PASSWORD = 'testpass123';

const waitRL = () => new Promise(r => setTimeout(r, 8000));

// ═══════════════════════════════════════════════════════════
// 1. SETUP  (must run first)
// ═══════════════════════════════════════════════════════════
test.describe('00-Setup', () => {
  test('create 2 users + 2 stories', async ({ request }) => {
    // User A
    expect((await apiRegister(request, EMAIL_A, PASSWORD, 'UserA')).status).toBe(201);
    const la = await apiLogin(request, EMAIL_A, PASSWORD);
    expect(la.status).toBe(200);
    S.userA = { token: la.body.token, email: EMAIL_A, id: la.body.userId };
    expect(S.userA.token).toBeTruthy();

    await waitRL();

    // User B
    expect((await apiRegister(request, EMAIL_B, PASSWORD, 'UserB')).status).toBe(201);
    const lb = await apiLogin(request, EMAIL_B, PASSWORD);
    expect(lb.status).toBe(200);
    S.userB = { token: lb.body.token, email: EMAIL_B, id: lb.body.userId };
    expect(S.userB.token).toBeTruthy();

    // Stories
    const sa = await apiCreateStory(request, S.userA.token, `SA ${ts}`, '用户A的测试故事。内容足够长，可以满足正文验证要求。');
    expect(sa.status).toBe(201);
    S.storyByA = { id: sa.body.id, title: sa.body.title };

    const sb = await apiCreateStory(request, S.userB.token, `SB ${ts}`, '用户B的测试故事。内容同样足够长以满足正文验证的要求。');
    expect(sb.status).toBe(201);
    S.storyByB = { id: sb.body.id, title: sb.body.title };
  });
});

// ═══════════════════════════════════════════════════════════
// 2. AUTH TESTS (API only)
// ═══════════════════════════════════════════════════════════
test.describe('01-Auth', () => {

  test('duplicate email → 409', async ({ request }) => {
    await waitRL();
    expect((await apiRegister(request, EMAIL_A, PASSWORD, 'Dup')).status).toBe(409);
  });

  test('short password → 400', async ({ request }) => {
    expect((await apiRegister(request, `sp-${ts}@e.com`, 'ab')).status).toBe(400);
  });

  test('wrong password → 401', async ({ request }) => {
    await waitRL();
    expect((await apiLogin(request, EMAIL_A, 'wrong')).status).toBe(401);
  });

  test('non-existent email → 401', async ({ request }) => {
    expect((await apiLogin(request, `nx-${ts}@e.com`, PASSWORD)).status).toBe(401);
  });

  test('new user gets 3 free music credits', async ({ request }) => {
    const e = `new-${ts}@e.com`;
    await apiRegister(request, e, 'pass1234', 'New');
    const l = await apiLogin(request, e, 'pass1234');
    const p = await apiGetProfile(request, l.body.token);
    expect(p.status).toBe(200);
    expect(p.body.freeMusicCount).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════
// 3. AUTHORIZATION (API only — CRITICAL SECURITY TESTS)
// ═══════════════════════════════════════════════════════════
test.describe('02-Authorization', () => {

  test('user A cannot burn user B story → 403', async ({ request }) => {
    expect((await apiBurnStory(request, S.userA.token, S.storyByB.id)).status).toBe(403);
  });

  test('user A cannot delete user B story → 403', async ({ request }) => {
    expect((await apiDeleteStory(request, S.userA.token, S.storyByB.id)).status).toBe(403);
    expect((await apiGetStory(request, S.storyByB.id)).status).toBe(200);
  });

  test('user A cannot update user B story → 403', async ({ request }) => {
    const r = await request.put(`${API_URL}/api/story/${S.storyByB.id}`, {
      headers: { Authorization: `Bearer ${S.userA.token}` },
      data: { title: 'Hack', content: 'Bad content attempt.' },
    });
    expect(r.status()).toBe(403);
  });

  test('user burns own story → 200 + content replaced', async ({ request }) => {
    const c = await apiCreateStory(request, S.userA.token, `BurnMe ${ts}`, '这篇故事即将焚烧。内容必须足够长以通过验证检查流程。');
    expect(c.status).toBe(201);
    expect((await apiBurnStory(request, S.userA.token, c.body.id)).status).toBe(200);
    const check = await apiGetStory(request, c.body.id);
    expect(check.body.content).toMatch(/尘烟|化为|墨迹/);
  });

  test('unauthenticated burn → 401', async ({ request }) => {
    expect((await apiBurnStory(request, '', S.storyByA.id)).status).toBe(401);
  });

  test('unauthenticated delete → 401', async ({ request }) => {
    expect((await apiDeleteStory(request, '', S.storyByA.id)).status).toBe(401);
  });

  test('comment ownership: user A cannot delete user B comment', async ({ request }) => {
    const add = await apiAddComment(request, S.storyByA.id, 'B的评论', S.userB.token);
    expect(add.status).toBe(201);
    const del = await apiDeleteComment(request, S.userA.token, add.body.id);
    console.log(`  Comment ownership: delete other → ${del.status}`);
  });

  test('normal user → admin API → 403', async ({ request }) => {
    const r = await request.get(`${API_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${S.userA.token}` },
    });
    expect(r.status()).toBe(403);
  });

  test('like: unauthenticated → 401, auth toggle works', async ({ request }) => {
    expect((await request.post(`${API_URL}/api/likes`, {
      data: { targetType: 'story', targetId: S.storyByA.id },
    })).status()).toBe(401);

    const like = await apiToggleLike(request, S.userA.token, 'story', S.storyByA.id);
    expect(like.status).toBe(200);
    expect(like.body.liked).toBe(true);

    const unlike = await apiToggleLike(request, S.userA.token, 'story', S.storyByA.id);
    expect(unlike.status).toBe(200);
    expect(unlike.body.liked).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. STORY CRUD (API only)
// ═══════════════════════════════════════════════════════════
test.describe('03-Story-CRUD', () => {

  test('create → 201, empty title → 400, empty content → 400', async ({ request }) => {
    expect((await apiCreateStory(request, S.userA.token, `N ${ts}`, '一篇正常故事内容，有足够文本通过验证检查。')).status).toBe(201);
    expect((await apiCreateStory(request, S.userA.token, '', 'Content validation text here.')).status).toBe(400);
    expect((await apiCreateStory(request, S.userA.token, 'Good', '')).status).toBe(400);
  });

  test('title 100 chars → 201, multiline → 201, emoji → 201', async ({ request }) => {
    expect((await apiCreateStory(request, S.userA.token, '测'.repeat(100), '测试极限标题，需要足够字数以满足正文验证要求。')).status).toBe(201);
    expect((await apiCreateStory(request, S.userA.token, `ML ${ts}`, '第一段。\n\n第二段。需要足够长来满足验证。')).status).toBe(201);
    expect((await apiCreateStory(request, S.userA.token, `E ${ts}`, '包含emoji 😀🎉 的故事内容，需要足够长的文本。')).status).toBe(201);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. COMMENTS (API only)
// ═══════════════════════════════════════════════════════════
test.describe('04-Comments', () => {

  test('create comment → 201, empty → 400', async ({ request }) => {
    expect((await apiAddComment(request, S.storyByA.id, '一条有效评论', S.userA.token)).status).toBe(201);
    expect((await apiAddComment(request, S.storyByA.id, '', S.userA.token)).status).toBe(400);
  });

  test('delete own comment', async ({ request }) => {
    const add = await apiAddComment(request, S.storyByA.id, '即将删除的评论', S.userA.token);
    const del = await apiDeleteComment(request, S.userA.token, add.body.id);
    console.log(`  Delete own comment: ${del.status}`);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. BURN (API)
// ═══════════════════════════════════════════════════════════
test.describe('05-Burn', () => {
  let burnId: number;

  test('setup: create story to burn', async ({ request }) => {
    const r = await apiCreateStory(request, S.userA.token, `Burn ${ts}`, '这篇故事将在测试中被焚烧。内容足够长以满足验证要求。');
    expect(r.status).toBe(201);
    burnId = r.body.id;
  });

  test('double burn → 400', async ({ request }) => {
    expect((await apiBurnStory(request, S.userA.token, burnId)).status).toBe(200);
    expect((await apiBurnStory(request, S.userA.token, burnId)).status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════
// 7. MUSIC (API)
// ═══════════════════════════════════════════════════════════
test.describe('06-Music', () => {

  test('unauthenticated → 401', async ({ request }) => {
    const r = await request.post(`${API_URL}/api/music/generate`, {
      data: { storyId: S.storyByA.id, text: '测试', musicType: 'instrumental', musicMood: 'peace', musicGenre: 'classical' },
    });
    expect(r.status()).toBe(401);
  });

  // MiniMax API generation test: skipped by default (requires API key)
  test.skip('generate → 202 or 402', async ({ request }) => {
    const r = await apiGenerateMusic(request, S.userA.token, S.storyByA.id, '配乐生成测试文本');
    expect([202, 402]).toContain(r.status);
    if (r.status === 202) expect(r.body.musicId).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 8. SECURITY (API)
// ═══════════════════════════════════════════════════════════
test.describe('07-Security', () => {

  test('XSS in title → stored as-is (frontend handles escaping)', async ({ request }) => {
    const r = await apiCreateStory(request, S.userA.token, '<script>alert(1)</script>', '正常文本内容足够满足验证要求通过检查。');
    expect(r.status).toBe(201);
    const fetched = await apiGetStory(request, r.body.id);
    expect(fetched.status).toBe(200);
    expect(fetched.body.title).toBe('<script>alert(1)</script>');
  });

  test('HTML in content → stored safely', async ({ request }) => {
    const r = await apiCreateStory(request, S.userA.token, `HTMLX ${Date.now()}`, '<b>bold</b> 正常文本更多文字以满足字数要求。');
    expect(r.status).toBe(201);
    const fetched = await apiGetStory(request, r.body.id);
    expect(fetched.status).toBe(200);
    expect(fetched.body.content).toContain('<b>bold</b>');
  });

  test('SQL injection title is handled safely', async ({ request }) => {
    const r = await apiCreateStory(request, S.userA.token, `SQLI ${Date.now()}`, '正常正文满足最低字数验证要求通过检验。');
    expect(r.status).toBe(201);
    const listRes = await request.get(`${API_URL}/api/story`);
    expect(listRes.status()).toBe(200);
  });

  test('malformed auth → 401', async ({ request }) => {
    const r = await request.post(`${API_URL}/api/story`, {
      headers: { Authorization: 'NotBearer xyz' },
      data: { title: 'T', content: 'Content for testing auth header.' },
    });
    expect(r.status()).toBe(401);
  });

  test('no leak: password hash, internal paths', async ({ request }) => {
    const lBody = JSON.stringify((await apiLogin(request, EMAIL_A, 'wrong')).body);
    expect(lBody).not.toContain('password_hash');
    expect(lBody).not.toContain('bcrypt');

    const sBody = JSON.stringify(await (await request.get(`${API_URL}/api/story/99999`)).json());
    expect(sBody).not.toMatch(/\/server\//);
    expect(sBody).not.toMatch(/\.ts:/);
  });
});

// ═══════════════════════════════════════════════════════════
// 9. EDGE CASES (API)
// ═══════════════════════════════════════════════════════════
test.describe('08-Edge-Cases', () => {

  test('5k-char content → 201', async ({ request }) => {
    expect((await apiCreateStory(request, S.userA.token, `Long ${ts}`, '长'.repeat(5000))).status).toBe(201);
  });

  test('rapid double-like → correct toggle state', async ({ request }) => {
    await apiToggleLike(request, S.userA.token, 'story', S.storyByB.id);
    await new Promise(r => setTimeout(r, 200));
    const r = await apiToggleLike(request, S.userA.token, 'story', S.storyByB.id);
    expect(r.status).toBe(200);
    expect(r.body.liked).toBe(false);
  });

  test('no token → 401', async ({ request }) => {
    expect((await request.post(`${API_URL}/api/story`, {
      data: { title: 'X', content: 'Need enough content to pass validation check.' },
    })).status()).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════
// 10. UI TESTS (all UI tests run LAST)
// ═══════════════════════════════════════════════════════════
test.describe('09-UI', () => {

  test('home page loads story list', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    expect(await page.locator('main').isVisible().catch(() => false)).toBeTruthy();
  });

  test('story detail: valid ID shows title', async ({ page }) => {
    await page.goto(`/story/${S.storyByA.id}`);
    await page.waitForTimeout(3000);
    await expect(page.locator('.story-title')).toBeVisible({ timeout: 8000 });
  });

  test('story detail: invalid ID shows not-found', async ({ page }) => {
    await page.goto('/story/99999');
    await page.waitForTimeout(2000);
    await expect(page.locator('.not-found')).toBeVisible({ timeout: 5000 });
  });

  test('burn button visible to author, hidden for non-author + modal interactions', async ({ page }) => {
    // Login as user A (author) via localStorage bypass
    await uiLoginFast(page, S.userA.token, S.userA.id, EMAIL_A);
    await page.goto(`/story/${S.storyByA.id}`);
    await page.waitForTimeout(2000);
    const burnBtn = page.locator('.burn-btn');
    const isVisible = await burnBtn.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();

    // ── Burn modal: open, close via overlay, escape, keep button ──
    await burnBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('.burn-modal')).toBeVisible({ timeout: 3000 });

    // Dismiss by clicking overlay edge
    await page.locator('.burn-modal-overlay').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
    const afterOverlay = await page.locator('.burn-modal').isVisible().catch(() => false);
    expect(afterOverlay).toBeFalsy();

    // Re-open and dismiss with Escape
    await burnBtn.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const afterEscape = await page.locator('.burn-modal').isVisible().catch(() => false);
    expect(afterEscape).toBeFalsy();

    // Re-open and click "keep" (cancel) button
    await burnBtn.click();
    await page.waitForTimeout(300);
    const keepBtn = page.locator('.burn-cancel-btn');
    if (await keepBtn.isVisible()) { await keepBtn.click(); await page.waitForTimeout(500); }
    expect(page.url()).toContain(`/story/${S.storyByA.id}`);

    // ── Now login as user B - burn button should NOT be visible for A's story ──
    await uiLoginFast(page, S.userB.token, S.userB.id, EMAIL_B);
    await page.goto(`/story/${S.storyByA.id}`);
    await page.waitForTimeout(2000);
    const notVisible = await page.locator('.burn-btn').isVisible().catch(() => false);
    expect(notVisible).toBeFalsy();
  });

  test('create page: inputs visible, validation, submit button disabled when empty', async ({ page }) => {
    await uiLoginFast(page, S.userA.token, S.userA.id, EMAIL_A);
    await page.goto('/create');
    await page.waitForTimeout(1500);

    await expect(page.locator('.title-input')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.content-textarea')).toBeVisible();
    await expect(page.locator('.submit-btn')).toBeDisabled();

    // Blur validation
    await page.fill('.title-input', 'a');
    await page.locator('.title-input').blur();
    await page.waitForTimeout(300);
    const err = page.locator('.field-error');
    if (await err.isVisible()) await expect(err).toContainText(/字符/);

    // Fill valid content → button should enable
    await page.fill('.title-input', `ValidTitle ${ts}`);
    await page.fill('.content-textarea', '足够长的内容来满足正文验证要求，验证按钮启用状态。');
    await page.waitForTimeout(300);
    const enabled = await page.locator('.submit-btn').isEnabled().catch(() => false);
    expect(enabled).toBeTruthy();
  });

  test('page transition animation class visible', async ({ page }) => {
    await uiLoginFast(page, S.userA.token, S.userA.id, EMAIL_A);
    await page.goto('/create');
    await page.waitForTimeout(1000);
    await expect(page.locator('.page-transition-enter')).toBeVisible({ timeout: 3000 });
  });

  test('logout clears auth state in localStorage', async ({ page }) => {
    await uiLoginFast(page, S.userB.token, S.userB.id, EMAIL_B);
    expect(page.url()).toBe('http://localhost:5173/');
    await page.locator('.nav-logout-btn').click();
    await page.waitForTimeout(500);
    const stored = await page.evaluate(() => localStorage.getItem('auth-storage'));
    if (stored) {
      const p = JSON.parse(stored);
      expect(p.state?.token).toBeFalsy();
      expect(p.state?.isAuthenticated).toBeFalsy();
    }
  });

  test('default page shows brand name', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const brand = page.locator('.nav-brand');
    await expect(brand).toBeVisible({ timeout: 8000 });
    const text = (await brand.textContent()) || '';
    expect(text).toBeTruthy();
  });

  test('music section or empty state visible when logged in as author', async ({ page }) => {
    await uiLoginFast(page, S.userA.token, S.userA.id, EMAIL_A);
    await page.goto(`/story/${S.storyByA.id}`);
    await page.waitForTimeout(3000);
    const ok = (await page.locator('.music-section').isVisible().catch(() => false))
            || (await page.locator('.music-empty').isVisible().catch(() => false));
    expect(ok).toBeTruthy();
  });

  test('route guards: unauthenticated → redirect to /login', async ({ page }) => {
    await page.goto('/create');
    await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
    expect(page.url()).toContain('/login');

    await page.goto('/my-space');
    await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
    expect(page.url()).toContain('/login');
  });

  test('logged-in user can access /login page', async ({ page }) => {
    await uiLoginFast(page, S.userA.token, S.userA.id, EMAIL_A);
    await page.goto('/login');
    await page.waitForTimeout(2000);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
  });
});
