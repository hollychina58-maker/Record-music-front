import { test, expect } from '@playwright/test';
import { apiRegister, apiLogin, apiCreateStory, uiLoginFast } from './helpers';

const API_URL = 'http://localhost:4000';
const ts = Date.now();

test.describe('Share Functionality', () => {
  const EMAIL = `share-test-${ts}@e.com`;
  const PASSWORD = 'testpass123';
  let token: string;
  let userId: number;
  let storyId: number;
  let storyTitle: string;

  test('01 - setup', async ({ request }) => {
    const reg = await apiRegister(request, EMAIL, PASSWORD, 'ShareTester');
    expect(reg.status).toBe(201);
    const login = await apiLogin(request, EMAIL, PASSWORD);
    expect(login.status).toBe(200);
    token = login.body.token;
    userId = login.body.userId;

    storyTitle = `分享测试 ${ts}`;
    const story = await apiCreateStory(request, token, storyTitle, '分享功能测试内容。需要足够长的文字来通过后端的内容验证，所以多写一些。');
    expect(story.status).toBe(201);
    storyId = story.body.id;
    console.log(`Setup done: user=${userId}, story=${storyId}`);
  });

  test('02 - full share flow', async ({ page }) => {
    // Login + navigate
    await uiLoginFast(page, token, userId, EMAIL);
    await page.goto(`/story/${storyId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open action menu (three dots)
    await page.locator('.action-toggle').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('.action-menu')).toBeVisible({ timeout: 5000 });

    // Click share button → API call → share panel
    await page.locator('.share-btn').click();
    await expect(page.locator('.share-panel')).toBeVisible({ timeout: 15000 });

    // ✅ Panel content
    await expect(page.locator('.share-panel')).toContainText(storyTitle);
    await expect(page.locator('.share-platform-btn')).toHaveCount(4);
    await expect(page.locator('.share-copy-btn')).toBeVisible();

    // ✅ Share link format
    const link = await page.locator('.share-link-input').inputValue();
    expect(link).toMatch(/\/story\/\d+/);
    expect(link).toContain(String(storyId));

    // ✅ Copy button feedback
    await page.locator('.share-copy-btn').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.share-copy-btn')).toHaveClass(/copied/);

    // ✅ WeChat copy hint
    await page.locator('.share-platform-btn').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('.share-wechat-hint')).toBeVisible({ timeout: 2000 });

    // ✅ Close panel via X button
    await page.locator('.share-panel-close').click();
    await page.waitForTimeout(500);
    const gone = await page.locator('.share-panel').isVisible().catch(() => false);
    expect(gone).toBeFalsy();
  });
});
