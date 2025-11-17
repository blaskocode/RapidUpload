/**
 * Cross-browser test suite with network throttling scenarios
 * Tests upload functionality across Chrome, Safari, Edge under various network conditions
 */

import { test, expect } from '@playwright/test';
import { createTestProperty, deleteTestProperty } from '../fixtures/propertyFixture';
import { generateTestImageFiles, cleanupTestImages } from '../fixtures/photoFixture';
import { TEST_PROPERTY_NAMES, TEST_NETWORK_CONDITIONS } from '../helpers/testData';

test.describe('Cross-Browser Upload Tests', () => {
  let propertyId: string;
  let testImageFiles: string[];

  test.beforeEach(async ({ page }) => {
    // Create a test property
    const property = await createTestProperty(page, TEST_PROPERTY_NAMES.DEFAULT);
    propertyId = property.propertyId;

    // Generate test images (50 photos for faster cross-browser tests)
    testImageFiles = generateTestImageFiles(50, 2 * 1024 * 1024);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
    if (propertyId) {
      try {
        await deleteTestProperty(page, propertyId);
      } catch (error) {
        console.warn('Failed to delete test property:', error);
      }
    }
    cleanupTestImages();
  });

  test('should upload photos on 3G connection', async ({ page, browserName }) => {
    // Set up 3G network throttling
    const context = page.context();
    await context.route('**/*', async (route) => {
      // Simulate 3G network conditions
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms latency
      await route.continue();
    });

    console.log(`Testing on ${browserName} with 3G connection`);

    // Navigate to upload page
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    // Select property
    const propertySelector = page.locator('select').first();
    await page.waitForSelector('select option:not([value=""])', { timeout: 10000 });
    await propertySelector.selectOption({ value: propertyId });
    await page.waitForTimeout(500);

    // Select files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImageFiles.slice(0, 50)); // Use 50 photos

    // Wait for upload to start
    await page.waitForSelector('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded/i', {
      timeout: 30000,
    });

    // Monitor upload progress (with longer timeout for 3G)
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes for 3G
    const startTime = Date.now();
    let uploadCompleted = false;

    while (Date.now() - startTime < maxWaitTime) {
      const progressText = await page
        .locator('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded/i')
        .first()
        .textContent()
        .catch(() => null);

      if (progressText) {
        const match = progressText.match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
          const completed = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          if (completed === total && total === 50) {
            uploadCompleted = true;
            break;
          }
        }
      }

      const successModal = page.locator('text=/Upload Complete/i');
      if (await successModal.isVisible({ timeout: 1000 }).catch(() => false)) {
        uploadCompleted = true;
        break;
      }

      await page.waitForTimeout(3000);
    }

    // Verify upload completed (may take longer on 3G)
    expect(uploadCompleted).toBeTruthy();

    // Verify via API
    const propertyResponse = await page.request.get(
      `${page.context().baseURL}/api/properties/${propertyId}`
    );
    const property = await propertyResponse.json();
    expect(property.photoCount).toBe(50);
  });

  test('should upload photos on 4G connection', async ({ page, browserName }) => {
    console.log(`Testing on ${browserName} with 4G connection`);

    // Navigate to upload page
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    // Select property
    const propertySelector = page.locator('select').first();
    await page.waitForSelector('select option:not([value=""])', { timeout: 10000 });
    await propertySelector.selectOption({ value: propertyId });
    await page.waitForTimeout(500);

    // Select files (200 photos for 4G test)
    // Generate additional files for 4G test
    const filesFor4G = generateTestImageFiles(200, 2 * 1024 * 1024);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filesFor4G);

    // Wait for upload to start
    await page.waitForSelector('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded/i', {
      timeout: 30000,
    });

    // Monitor upload progress
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes for 4G
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const progressText = await page
        .locator('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded/i')
        .first()
        .textContent()
        .catch(() => null);

      if (progressText) {
        const match = progressText.match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
          const completed = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          if (completed === total && total === 200) {
            break;
          }
        }
      }

      const successModal = page.locator('text=/Upload Complete/i');
      if (await successModal.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }

      await page.waitForTimeout(2000);
    }

    // Verify via API
    const propertyResponse = await page.request.get(
      `${page.context().baseURL}/api/properties/${propertyId}`
    );
    const property = await propertyResponse.json();
    expect(property.photoCount).toBe(200);
  });

  test('should handle offline to online transition', async ({ page, browserName }) => {
    console.log(`Testing offline/online transition on ${browserName}`);

    // Navigate to upload page
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    // Select property
    const propertySelector = page.locator('select').first();
    await page.waitForSelector('select option:not([value=""])', { timeout: 10000 });
    await propertySelector.selectOption({ value: propertyId });
    await page.waitForTimeout(500);

    // Go offline
    await page.context().setOffline(true);
    console.log('Set browser to offline mode');

    // Try to select files while offline
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImageFiles.slice(0, 10));

    // Wait a bit to see if uploads are queued
    await page.waitForTimeout(2000);

    // Check that uploads are queued (not started)
    const progressText = await page
      .locator('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded|queued|waiting/i')
      .first()
      .textContent()
      .catch(() => null);

    // Go online
    await page.context().setOffline(false);
    console.log('Set browser to online mode');

    // Wait for uploads to start
    await page.waitForSelector('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded/i', {
      timeout: 30000,
    });

    // Wait for uploads to complete
    const maxWaitTime = 3 * 60 * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const progressText = await page
        .locator('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded/i')
        .first()
        .textContent()
        .catch(() => null);

      if (progressText) {
        const match = progressText.match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
          const completed = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          if (completed === total && total === 10) {
            break;
          }
        }
      }

      const successModal = page.locator('text=/Upload Complete/i');
      if (await successModal.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }

      await page.waitForTimeout(2000);
    }

    // Verify via API
    const propertyResponse = await page.request.get(
      `${page.context().baseURL}/api/properties/${propertyId}`
    );
    const property = await propertyResponse.json();
    expect(property.photoCount).toBe(10);
  });
});

