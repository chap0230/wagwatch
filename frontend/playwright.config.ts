import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'iPhone', use: { ...devices['iPhone 14'] } },
    { name: 'Android', use: { ...devices['Pixel 7'] } },
    { name: 'Desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
