import { test, expect } from '@playwright/test';

test.describe('Mobile UX', () => {
  test('login page is mobile-friendly', async ({ page }) => {
    await page.goto('/login');
    // Verify inputs are full-width and tappable
    const email = page.getByPlaceholder('Email');
    const box = await email.boundingBox();
    expect(box!.width).toBeGreaterThan(250);
    expect(box!.height).toBeGreaterThanOrEqual(44); // minimum tap target
  });

  test('register page inputs meet tap target size', async ({ page }) => {
    await page.goto('/register');
    const name = page.getByPlaceholder('Your name');
    const box = await name.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
