import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // workers:1 避免两个 spec 并行触发 auth 限流(10/min)导致偶发 429 假失败
  workers: 1,
  timeout: 120000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
  webServer: [
    {
      command: 'set AUTH_RATE_LIMIT_MAX=100 && cd server && npx tsx src/index.ts',
      port: 4000,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'cd client && npx vite --port 5173',
      port: 5173,
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
