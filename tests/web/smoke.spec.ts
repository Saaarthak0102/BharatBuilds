import { test, expect } from '@playwright/test';

/**
 * Smoke test stubs for Saans web app.
 * Run with: npx playwright test
 */

test.describe('Landing page', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Saans/);
    // TODO: Check for hero section, navbar, footer
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    // TODO: Check navbar links
    // TODO: Check CTA buttons navigate to signup
  });
});

test.describe('Auth flow', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    // TODO: Check for login form
  });

  test('should load signup page', async ({ page }) => {
    await page.goto('/signup');
    // TODO: Check for role selector
  });

  test('should redirect unauthenticated users from /farmer to /login', async ({ page }) => {
    await page.goto('/farmer');
    // TODO: Verify redirect to login
  });
});

test.describe('Farmer dashboard', () => {
  test.skip('should display farmer dashboard when authenticated', async ({ page }) => {
    // TODO: Set up mock auth, navigate to /farmer, check for data panel and action tiles
  });
});

test.describe('Citizen dashboard', () => {
  test.skip('should display citizen dashboard when authenticated', async ({ page }) => {
    // TODO: Set up mock auth, navigate to /citizen, check for AQI badge and action tiles
  });
});

test.describe('Map', () => {
  test.skip('should load map page', async ({ page }) => {
    // TODO: Navigate to /map, check MapLibre loads
  });
});
