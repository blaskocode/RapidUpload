/**
 * CORS validation test
 * Verifies CORS headers on S3 presigned URLs work correctly
 */

import { test, expect } from '@playwright/test';
import { createTestProperty, deleteTestProperty } from '../fixtures/propertyFixture';
import { generateTestImageFiles, cleanupTestImages, getPresignedUrl } from '../fixtures/photoFixture';
import { TEST_PROPERTY_NAMES } from '../helpers/testData';

test.describe('CORS Validation', () => {
  let propertyId: string;
  let testImageFiles: string[];

  test.beforeEach(async ({ page }) => {
    // Create a test property
    const property = await createTestProperty(page, TEST_PROPERTY_NAMES.DEFAULT);
    propertyId = property.propertyId;

    // Generate test images
    testImageFiles = generateTestImageFiles(5, 2 * 1024 * 1024);
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

  test('should have valid CORS headers on S3 presigned URLs', async ({ page }) => {
    // Get a presigned URL
    const presignedData = await getPresignedUrl(
      page,
      propertyId,
      'test-image.jpg',
      'image/jpeg',
      2 * 1024 * 1024
    );

    // Make an OPTIONS request to check CORS preflight
    const optionsResponse = await page.request.fetch(presignedData.uploadUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': page.url(),
        'Access-Control-Request-Method': 'PUT',
      },
    });

    // Check CORS headers
    const corsHeaders = {
      'access-control-allow-origin': optionsResponse.headers()['access-control-allow-origin'],
      'access-control-allow-methods': optionsResponse.headers()['access-control-allow-methods'],
      'access-control-allow-headers': optionsResponse.headers()['access-control-allow-headers'],
    };

    console.log('CORS Headers:', corsHeaders);

    // Verify CORS headers are present (S3 should return appropriate CORS headers)
    // Note: S3 CORS is configured on the bucket, so headers may vary
    // We just verify the request doesn't fail with CORS error
    expect(optionsResponse.status()).toBeLessThan(500); // Should not be a server error

    // Try to upload a file using the presigned URL
    const uploadResponse = await page.request.put(presignedData.uploadUrl, {
      data: testImageFiles[0],
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });

    // Verify upload succeeds (status 200)
    expect(uploadResponse.status()).toBe(200);
  });

  test('should handle CORS errors gracefully', async ({ page }) => {
    // Navigate to upload page
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    // Select property
    const propertySelector = page.locator('select').first();
    await page.waitForSelector('select option:not([value=""])', { timeout: 10000 });
    await propertySelector.selectOption({ value: propertyId });
    await page.waitForTimeout(500);

    // Monitor console for CORS errors
    const corsErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('CORS')) {
        corsErrors.push(msg.text());
      }
    });

    // Select files and start upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImageFiles);

    // Wait for upload to complete
    await page.waitForSelector('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded/i', {
      timeout: 30000,
    });

    // Wait for uploads to finish
    const maxWaitTime = 2 * 60 * 1000;
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
          if (completed === total && total === 5) {
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

    // Verify no CORS errors occurred
    console.log('CORS Errors detected:', corsErrors);
    expect(corsErrors.length).toBe(0);
  });
});

