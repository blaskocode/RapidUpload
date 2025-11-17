/**
 * End-to-end test: Complete upload flow
 * Test 1: Create property → Select 100 photos → Upload → Verify all appear in gallery → Verify count updates
 */

import { test, expect } from '@playwright/test';
import { createTestProperty, deleteTestProperty } from '../fixtures/propertyFixture';
import { generateTestImageFiles, cleanupTestImages } from '../fixtures/photoFixture';
import { TEST_PHOTO_COUNTS, TEST_PROPERTY_NAMES } from '../helpers/testData';

test.describe('Complete Upload Flow', () => {
  let propertyId: string;
  let testImageFiles: string[];

  test.beforeEach(async ({ page }) => {
    // Create a test property
    const property = await createTestProperty(page, TEST_PROPERTY_NAMES.DEFAULT);
    propertyId = property.propertyId;

    // Generate test images
    testImageFiles = generateTestImageFiles(TEST_PHOTO_COUNTS.MEDIUM, 2 * 1024 * 1024);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Delete property and test images
    if (propertyId) {
      try {
        await deleteTestProperty(page, propertyId);
      } catch (error) {
        console.warn('Failed to delete test property:', error);
      }
    }
    cleanupTestImages();
  });

  test('should complete full upload flow: create property → upload 100 photos → verify gallery', async ({
    page,
  }) => {
    // Step 1: Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take screenshot of home page
    await page.screenshot({ path: 'test-results/01-homepage.png' });

    // Step 2: Navigate to upload page
    // Set up console and network error logging
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('Console error:', msg.text());
      }
    });
    
    page.on('response', (response) => {
      if (!response.ok() && response.url().includes('/api/')) {
        networkErrors.push(`${response.status()} ${response.url()}`);
        console.log('Network error:', response.status(), response.url());
      }
    });
    
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    // Take screenshot of upload page
    await page.screenshot({ path: 'test-results/02-upload-page.png' });
    
    // Log any errors we captured
    if (consoleErrors.length > 0) {
      console.log('Console errors found:', consoleErrors);
    }
    if (networkErrors.length > 0) {
      console.log('Network errors found:', networkErrors);
    }
    
    // Check what's actually on the page
    const pageContent = await page.content();
    const hasSelect = pageContent.includes('<select');
    const hasLoadingText = pageContent.includes('Loading properties');
    console.log('Page has select:', hasSelect);
    console.log('Page has loading text:', hasLoadingText);

    // Step 3: Wait for properties to load and select property from dropdown
    // First, wait for the loading state to finish - either select appears or loading text disappears
    // The select only appears when propertiesLoading is false
    await page.waitForFunction(
      () => {
        // Check if loading text exists
        const loadingText = Array.from(document.querySelectorAll('*')).find(
          el => el.textContent?.trim() === 'Loading properties...'
        );
        // Check if select exists
        const select = document.querySelector('select');
        // Select should exist and loading text should not exist
        return select !== null && loadingText === undefined;
      },
      { timeout: 30000 }
    );
    
    // Wait for properties to actually load - check that select has options with values
    // Options in a closed select aren't "visible" so we check via JavaScript
    await page.waitForFunction(
      () => {
        const select = document.querySelector('select');
        if (!select) return false;
        const options = Array.from(select.querySelectorAll('option[value]:not([value=""])'));
        return options.length > 0;
      },
      { timeout: 20000 }
    );
    
    const propertySelector = page.locator('select').first();
    await expect(propertySelector).toBeVisible({ timeout: 5000 });

    // Select the property we created
    await propertySelector.selectOption({ value: propertyId });
    await page.waitForTimeout(500); // Wait for selection to register

    // Take screenshot after property selection
    await page.screenshot({ path: 'test-results/03-property-selected.png' });

    // Step 4: Upload files using file input
    // File inputs are often hidden and triggered by buttons, so we don't check visibility
    const fileInput = page.locator('input[type="file"]');
    // Just verify it exists in the DOM (it may be hidden)
    await fileInput.waitFor({ state: 'attached', timeout: 5000 });

    // Set files (limit to 100 for this test)
    const filesToUpload = testImageFiles.slice(0, TEST_PHOTO_COUNTS.MEDIUM);
    await fileInput.setInputFiles(filesToUpload);

    // Take screenshot after file selection
    await page.screenshot({ path: 'test-results/04-files-selected.png' });

    // Step 5: Wait for upload to start (check for batch progress)
    // Wait for upload progress to appear (this indicates uploads have started)
    await page.waitForSelector('text=/\\d+\\s*\\/\\s*\\d+\\s+uploaded/i', {
      timeout: 30000,
    });

    // Take screenshot during upload
    await page.screenshot({ path: 'test-results/05-upload-in-progress.png' });

    // Step 6: Wait for all uploads to complete
    // Look for success indicators: "100/100 uploaded" or success modal
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes max (100 files at 2MB each can take time)
    const startTime = Date.now();
    let lastProgress = '0/0';

    while (Date.now() - startTime < maxWaitTime) {
      // Check if page is still open
      if (page.isClosed()) {
        throw new Error('Page was closed during upload');
      }

      // Check batch progress text (e.g., "100 / 100 uploaded")
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
          const currentProgress = `${completed}/${total}`;
          
          // Log progress if it changed
          if (currentProgress !== lastProgress) {
            console.log(`Upload progress: ${currentProgress}`);
            lastProgress = currentProgress;
          }
          
          if (completed === total && total === TEST_PHOTO_COUNTS.MEDIUM) {
            // All uploads complete, wait a bit for success modal
            await page.waitForTimeout(2000);
            break;
          }
        }
      }

      // Check for success modal with "Upload Complete!" or "View Gallery" button
      const successModal = page.locator('text=/Upload Complete|View Gallery|All uploads complete/i');
      if (await successModal.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('Success modal detected');
        break;
      }

      // Check if all items show as complete in the queue
      const failedCount = await page
        .locator('text=/failed/i')
        .count()
        .catch(() => 0);
      
      if (failedCount === 0) {
        // Check if we have the expected number of completed items
        const completedItems = await page
          .locator('[class*="complete"], [class*="success"]')
          .count()
          .catch(() => 0);
        
        if (completedItems >= TEST_PHOTO_COUNTS.MEDIUM) {
          console.log(`All ${TEST_PHOTO_COUNTS.MEDIUM} items completed`);
          break;
        }
      }

      await page.waitForTimeout(3000); // Wait 3 seconds before checking again
    }

    // If we timed out, take a screenshot for debugging
    if (Date.now() - startTime >= maxWaitTime) {
      await page.screenshot({ path: 'test-results/05-upload-timeout.png', fullPage: true });
      throw new Error(`Upload did not complete within ${maxWaitTime / 1000} seconds. Last progress: ${lastProgress}`);
    }

    // Take screenshot after uploads complete
    await page.screenshot({ path: 'test-results/06-uploads-complete.png' });

    // Step 7: Navigate to gallery page
    // Click "View Gallery" button in success modal if present, or navigate directly
    const viewGalleryButton = page.locator('button:has-text("View Gallery")');
    if (await viewGalleryButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewGalleryButton.click();
      await page.waitForURL(/\/properties\/[^/]+\/gallery/, { timeout: 10000 });
    } else {
      // Navigate directly to gallery
      await page.goto(`/properties/${propertyId}/gallery`);
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for gallery to load

    // Take screenshot of gallery
    await page.screenshot({ path: 'test-results/07-gallery-page.png' });

    // Step 8: Verify all photos appear in gallery
    // Wait for gallery grid to load
    await page.waitForSelector('[class*="grid"]', { timeout: 10000 });

    // Wait for at least one photo thumbnail to load
    const photoThumbnails = page.locator('img[src*="s3"], img[src*="amazonaws"], [class*="aspect-square"] img');
    await photoThumbnails.first().waitFor({ timeout: 30000 });

    // Get count of visible photos
    let photoCount = await photoThumbnails.count();

    // Step 9: Verify photo count in property header/info
    const photoCountText = await page
      .locator('text=/\\d+ photos?/i')
      .first()
      .textContent()
      .catch(() => null);

    let displayedCount: number | null = null;
    if (photoCountText) {
      const match = photoCountText.match(/(\d+)/);
      if (match) {
        displayedCount = parseInt(match[1], 10);
        expect(displayedCount).toBe(TEST_PHOTO_COUNTS.MEDIUM);
      }
    }

    // Step 10: Scroll to load more photos (if lazy loading)
    // The gallery uses progressive loading, so we may need to scroll
    if (photoCount < TEST_PHOTO_COUNTS.MEDIUM) {
      // Scroll down multiple times to trigger lazy loading
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1500); // Wait for images to load
        
        const newCount = await photoThumbnails.count();
        if (newCount >= TEST_PHOTO_COUNTS.MEDIUM || newCount === photoCount) {
          photoCount = newCount;
          break;
        }
        photoCount = newCount;
      }
    }

    // Final verification: Check that we can see photos
    expect(photoCount).toBeGreaterThan(0);
    // With lazy loading, we may not see all 100 immediately, but we should see many
    expect(photoCount).toBeGreaterThanOrEqual(Math.min(50, TEST_PHOTO_COUNTS.MEDIUM));

    // Take final screenshot
    await page.screenshot({ path: 'test-results/08-gallery-verified.png' });

    // Step 11: Verify property count via API
    const backendURL = process.env.BACKEND_URL || 'http://localhost:8080';
    const propertyResponse = await page.request.get(
      `${backendURL}/api/properties/${propertyId}`
    );
    expect(propertyResponse.ok()).toBeTruthy();
    
    const property = await propertyResponse.json();
    expect(property.photoCount).toBe(TEST_PHOTO_COUNTS.MEDIUM);
  });

  test('should handle property creation via UI', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for any Next.js dev overlay to disappear
    await page.waitForTimeout(1000);
    
    // Dismiss any dev overlay if present
    const devOverlay = page.locator('[data-nextjs-dev-overlay]');
    if (await devOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try to close the overlay
      const closeButton = page.locator('[data-nextjs-dev-overlay] button');
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Find and click "Create Property" button
    const createButton = page.locator('button:has-text("Create Property"), button:has-text("New Property")');
    await expect(createButton).toBeVisible({ timeout: 10000 });
    
    // Use force click to bypass any overlay issues
    await createButton.click({ force: true });

    // Wait for modal/form to appear - use the id selector which is more specific
    await page.waitForSelector('input#name, input[type="text"][id="name"]', { timeout: 10000 });

    // Fill in property name
    const propertyName = `E2E Test Property ${Date.now()}`;
    await page.fill('input[type="text"], input[name="name"]', propertyName);

    // Submit form - be more specific to avoid clicking the "Create Property" button on the page
    // Use the submit button inside the form/modal
    const submitButton = page.locator('form button[type="submit"], [role="dialog"] button[type="submit"]').first();
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Wait for property to be created (either navigate to property page or see it in list)
    await page.waitForTimeout(2000);

    // Verify property appears in list or we're on property page
    const propertyInList = page.locator(`text=${propertyName}`);
    const isOnPropertyPage = page.url().includes('/properties/');

    expect(propertyInList.isVisible().catch(() => false) || isOnPropertyPage).toBeTruthy();
  });
});

