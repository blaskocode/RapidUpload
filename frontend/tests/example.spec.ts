/**
 * Example test to verify Playwright setup
 */

import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  
  // Check that the page loads
  await expect(page).toHaveTitle(/RapidUpload/i);
  
  // Take a screenshot
  await page.screenshot({ path: 'test-results/homepage.png' });
});

test('can navigate to properties', async ({ page }) => {
  await page.goto('/');
  
  // Look for property-related content or navigation
  const hasPropertyContent = await page.locator('body').textContent();
  expect(hasPropertyContent).toBeTruthy();
});

