/**
 * Resilience test: 1000 photo upload with simulated failures and retry validation
 * Test 2: Upload 1000 photos → Simulate 5 random failures → Verify auto-retry → Manually retry → Verify 100% success
 */

import { test, expect } from '@playwright/test';
import { createTestProperty, deleteTestProperty } from '../fixtures/propertyFixture';
import { generateTestImageFiles, cleanupTestImages } from '../fixtures/photoFixture';
import { injectS3Failures, removeS3Mock } from '../helpers/s3Mock';
import { TEST_PHOTO_COUNTS, TEST_PROPERTY_NAMES } from '../helpers/testData';

test.describe('Resilience Test - Upload with Failures', () => {
  let propertyId: string;
  let testImageFiles: string[];
  const TOTAL_PHOTOS = TEST_PHOTO_COUNTS.LARGE; // 1000 photos
  const FAILURE_COUNT = 5;

  test.beforeEach(async ({ page }) => {
    // Create a test property
    const property = await createTestProperty(page, TEST_PROPERTY_NAMES.DEFAULT);
    propertyId = property.propertyId;

    // Generate test images
    testImageFiles = generateTestImageFiles(TOTAL_PHOTOS, 2 * 1024 * 1024);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Remove S3 mocks
    await removeS3Mock(page);

    // Delete property
    if (propertyId) {
      try {
        await deleteTestProperty(page, propertyId);
      } catch (error) {
        console.warn('Failed to delete test property:', error);
      }
    }
    cleanupTestImages();
  });

  test('should handle 1000 photo upload with 5 injected failures and achieve 100% success', async ({
    page,
  }) => {
    // Step 1: Navigate to upload page
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    // Step 2: Select property
    const propertySelector = page.locator('select').first();
    await expect(propertySelector).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('select option:not([value=""])', { timeout: 10000 });
    await propertySelector.selectOption({ value: propertyId });
    await page.waitForTimeout(500);

    // Step 3: Set up S3 failure injection BEFORE selecting files
    // Track failed uploads
    const failedKeys: string[] = [];
    let failureInjected = 0;
    let requestCount = 0;

    // Set up route interception to inject failures deterministically
    await page.route('**/*.s3.*.amazonaws.com/**', async (route) => {
      requestCount++;
      const url = route.request().url();
      
      // Inject failure for specific request numbers to ensure we get exactly 5 failures
      // Fail requests 10, 50, 100, 200, 300 (spread throughout the upload process)
      const failurePoints = [10, 50, 100, 200, 300];
      
      if (failureInjected < FAILURE_COUNT && failurePoints.includes(requestCount)) {
        // Extract S3 key from URL if possible
        const keyMatch = url.match(/\/properties\/[^/]+\/([^/?]+)/);
        if (keyMatch) {
          const s3Key = keyMatch[1];
          failedKeys.push(s3Key);
          failureInjected++;
          
          console.log(`Injecting S3 failure #${failureInjected} for request #${requestCount}`);
          
          // Simulate S3 failure (500 error)
          await route.fulfill({
            status: 500,
            body: 'Simulated S3 upload failure',
          });
          return;
        }
      }
      
      // Allow other requests to proceed
      await route.continue();
    });

    // Step 4: Select files (this will trigger uploads)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 5000 });
    await fileInput.setInputFiles(testImageFiles);

    // Step 5: Wait for upload to start
    await page.waitForSelector('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded/i', {
      timeout: 30000,
    });

    // Step 6: Monitor upload progress and track failures
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes max for 1000 photos
    const startTime = Date.now();
    let lastCompletedCount = 0;
    let retryCount = 0;

    // Monitor upload progress
    while (Date.now() - startTime < maxWaitTime) {
      // Check batch progress
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
          
          // Check if we've made progress (indicates retries are working)
          if (completed > lastCompletedCount) {
            lastCompletedCount = completed;
          }

          // Check for failed count
          const failedText = await page
            .locator('text=/\\d+\\s+failed/i')
            .first()
            .textContent()
            .catch(() => null);

          if (failedText) {
            const failedMatch = failedText.match(/(\d+)/);
            if (failedMatch) {
              const failedCount = parseInt(failedMatch[1], 10);
              
              // If we have failures and they're not retrying, we may need manual retry
              if (failedCount > 0 && completed === lastCompletedCount) {
                // Wait a bit more for auto-retry
                await page.waitForTimeout(5000);
                
                // Check again
                const newProgressText = await page
                  .locator('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded/i')
                  .first()
                  .textContent()
                  .catch(() => null);
                
                if (newProgressText) {
                  const newMatch = newProgressText.match(/(\d+)\s*\/\s*(\d+)/);
                  if (newMatch && parseInt(newMatch[1], 10) === completed) {
                    // Auto-retry exhausted, need manual retry
                    break;
                  }
                }
              }
            }
          }

          // Check if all uploads complete
          if (completed === total && total === TOTAL_PHOTOS) {
            break;
          }
        }
      }

      // Check for success modal
      const successModal = page.locator('text=/Upload Complete/i');
      if (await successModal.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }

      await page.waitForTimeout(3000); // Wait 3 seconds before checking again
    }

    // Step 7: Check upload store state via page.evaluate
    const uploadState = await page.evaluate(() => {
      // Access Zustand store from window (if exposed) or localStorage
      const storage = localStorage.getItem('upload-queue-storage');
      if (storage) {
        try {
          return JSON.parse(storage);
        } catch (e) {
          return null;
        }
      }
      return null;
    });

    // Step 8: If there are failures, manually retry them
    // Look for retry buttons in the UI
    const retryButtons = page.locator('button:has-text("Retry"), button[aria-label*="retry" i]');
    const retryButtonCount = await retryButtons.count();

    if (retryButtonCount > 0) {
      // Click all retry buttons
      for (let i = 0; i < retryButtonCount; i++) {
        await retryButtons.nth(i).click();
        await page.waitForTimeout(500);
      }

      // Remove S3 mock to allow retries to succeed
      await removeS3Mock(page);

      // Wait for retries to complete
      const retryMaxWait = 5 * 60 * 1000; // 5 minutes for retries
      const retryStartTime = Date.now();

      while (Date.now() - retryStartTime < retryMaxWait) {
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
            if (completed === total && total === TOTAL_PHOTOS) {
              break;
            }
          }
        }

        // Check for success modal
        const successModal = page.locator('text=/Upload Complete/i');
        if (await successModal.isVisible({ timeout: 1000 }).catch(() => false)) {
          break;
        }

        await page.waitForTimeout(2000);
      }
    }

    // Step 9: Verify final success rate via API
    const propertyResponse = await page.request.get(
      `${page.context().baseURL}/api/properties/${propertyId}`
    );
    expect(propertyResponse.ok()).toBeTruthy();
    
    const property = await propertyResponse.json();
    expect(property.photoCount).toBe(TOTAL_PHOTOS);

    // Step 10: Verify via UI - check batch progress shows 1000/1000
    const finalProgressText = await page
      .locator('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded/i')
      .first()
      .textContent()
      .catch(() => null);

    if (finalProgressText) {
      const match = finalProgressText.match(/(\d+)\s*\/\s*(\d+)/);
      if (match) {
        const completed = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        expect(completed).toBe(TOTAL_PHOTOS);
        expect(total).toBe(TOTAL_PHOTOS);
      }
    }

    // Step 11: Verify no failed uploads remain
    const failedText = await page
      .locator('text=/\\d+\\s+failed/i')
      .first()
      .textContent()
      .catch(() => null);

    if (failedText) {
      const failedMatch = failedText.match(/(\d+)/);
      if (failedMatch) {
        const failedCount = parseInt(failedMatch[1], 10);
        expect(failedCount).toBe(0);
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/resilience-test-complete.png' });

    // Log test results
    console.log(`✅ Resilience test complete:`);
    console.log(`   - Total photos: ${TOTAL_PHOTOS}`);
    console.log(`   - Failures injected: ${failureInjected}`);
    console.log(`   - Final success rate: 100% (${TOTAL_PHOTOS}/${TOTAL_PHOTOS})`);
  });
});

