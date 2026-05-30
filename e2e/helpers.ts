import { APIRequestContext, Page, expect } from '@playwright/test';

const API_URL = 'http://localhost:4000';

// ─── Utils ──────────────────────────────────────────────────

/** API responses are wrapped in { success, data, error }. Unwrap to top-level. */
function unwrap(body: any): any {
  if (body && typeof body === 'object' && 'data' in body) {
    return { ...body.data, _success: body.success, _error: body.error };
  }
  return body;
}

// ─── API Helpers ────────────────────────────────────────────

export async function apiRegister(
  request: APIRequestContext,
  email: string,
  password: string,
  nickname?: string,
) {
  const res = await request.post(`${API_URL}/api/auth/register`, {
    data: { email, password, nickname: nickname || email.split('@')[0] },
  });
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password },
  });
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiCreateStory(
  request: APIRequestContext,
  token: string,
  title: string,
  content: string,
) {
  const res = await request.post(`${API_URL}/api/story`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { userId: 0, title, content },
  });
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiDeleteStory(
  request: APIRequestContext,
  token: string,
  storyId: number,
) {
  const res = await request.delete(`${API_URL}/api/story/${storyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiBurnStory(
  request: APIRequestContext,
  token: string,
  storyId: number,
) {
  const res = await request.post(`${API_URL}/api/stories/${storyId}/burn`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiGetStory(
  request: APIRequestContext,
  storyId: number,
) {
  const res = await request.get(`${API_URL}/api/story/${storyId}`);
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiAddComment(
  request: APIRequestContext,
  storyId: number,
  content: string,
  token?: string,
) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await request.post(`${API_URL}/api/stories/${storyId}/comments`, {
    headers,
    data: { content },
  });
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiDeleteComment(
  request: APIRequestContext,
  token: string,
  commentId: number,
) {
  const res = await request.delete(`${API_URL}/api/comments/${commentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiGetComments(
  request: APIRequestContext,
  storyId: number,
) {
  const res = await request.get(`${API_URL}/api/stories/${storyId}/comments`);
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiToggleLike(
  request: APIRequestContext,
  token: string,
  targetType: 'story' | 'comment',
  targetId: number,
) {
  const res = await request.post(`${API_URL}/api/likes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { targetType, targetId },
  });
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiGenerateMusic(
  request: APIRequestContext,
  token: string,
  storyId: number,
  text: string,
) {
  const res = await request.post(`${API_URL}/api/music/generate`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      storyId,
      text,
      musicType: 'instrumental',
      musicMood: 'sorrow',
      musicGenre: 'chinese_folk',
    },
  });
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiGetMusicStatus(request: APIRequestContext, musicId: number) {
  const res = await request.get(`${API_URL}/api/music/status/${musicId}`);
  return { status: res.status(), body: unwrap(await res.json()) };
}

export async function apiGetProfile(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_URL}/api/users/me/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status(), body: unwrap(await res.json()) };
}

// ─── UI Helpers ─────────────────────────────────────────────

/** Bypass login form by injecting auth state into localStorage directly.
 *  Navigates to app origin first, sets auth in localStorage, then reloads
 *  so Zustand persist middleware re-hydrates with the correct user. */
export async function uiLoginFast(
  page: Page,
  token: string,
  userId: number,
  email: string,
  nickname = 'TestUser',
) {
  // Must navigate to app origin first so localStorage is scoped correctly
  await page.goto('/');
  await page.waitForTimeout(500);

  const authData = JSON.stringify({
    state: {
      token,
      user: {
        id: userId,
        email,
        nickname,
        avatar: null,
        freeMusicCount: 3,
        hasActiveSubscription: false,
        subscriptionMusicRemaining: null,
        role: 'user',
      },
      isAuthenticated: true,
    },
    version: 0,
  });

  // Write auth to localStorage on the app's origin, then hard-refresh
  await page.evaluate((data) => {
    localStorage.setItem('auth-storage', data);
  }, authData);
  await page.reload();
  await page.waitForTimeout(1500);
}

export async function uiLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for navigation or error message
  try {
    await page.waitForURL('/', { timeout: 15000 });
  } catch {
    // Login may have failed — check for error message
    const error = page.locator('.error-message');
    const isError = await error.isVisible().catch(() => false);
    if (isError) {
      const text = await error.textContent();
      throw new Error(`Login failed: ${text}`);
    }
    // If no error and no navigation, wait a bit more
    await page.waitForTimeout(2000);
  }
}

export async function uiCreateStory(
  page: Page,
  title: string,
  content: string,
  withMusic = false,
) {
  await page.goto('/create');
  await page.waitForSelector('.title-input', { timeout: 10000 });
  await page.fill('.title-input', title);
  await page.fill('.content-textarea', content);
  if (withMusic) {
    const checkbox = page.locator('.music-toggle input[type="checkbox"]');
    if (await checkbox.isEnabled()) await checkbox.check();
  }
  await page.click('.submit-btn');
}
