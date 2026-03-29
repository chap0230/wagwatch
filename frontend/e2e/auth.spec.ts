import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Dog Health Tracker')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });

  test('has sign up link on login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Sign up')).toBeVisible();
  });

  test('navigates to register page', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Sign up').click();
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
  });

  test('shows validation on empty login submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Sign In').click();
    // HTML5 validation prevents submission — email field should be focused
    const email = page.getByPlaceholder('Email');
    await expect(email).toBeFocused();
  });
});

test.describe('Navigation', () => {
  test('login page redirects unauthenticated access to protected routes', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByPlaceholder('Email')).toBeVisible();
  });

  test('register page has back link to login', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText('Sign in')).toBeVisible();
  });
});
