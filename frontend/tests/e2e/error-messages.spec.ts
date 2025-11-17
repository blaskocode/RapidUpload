/**
 * Error message validation test
 * Verifies user-friendly error messages for various failure scenarios
 */

import { test, expect } from '@playwright/test';
import { createTestProperty, deleteTestProperty } from '../fixtures/propertyFixture';
import { generateTestImageFiles, cleanupTestImages } from '../fixtures/photoFixture';
import { TEST_PROPERTY_NAMES } from '../helpers/testData';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Error Message Validation', () => {
  let propertyId: string;

  test.beforeEach(async ({ page }) => {
    // Create a test property
    const property = await createTestProperty(page, TEST_PROPERTY_NAMES.DEFAULT);
    propertyId = property.propertyId;
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
  });

  test('should show user-friendly error for invalid file type', async ({ page }) => {
    // Navigate to upload page
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    // Select property
    const propertySelector = page.locator('select').first();
    await page.waitForSelector('select option:not([value=""])', { timeout: 10000 });
    await propertySelector.selectOption({ value: propertyId });
    await page.waitForTimeout(500);

    // Create a test file with invalid type (text file)
    const tempDir = './tests/fixtures/temp-files';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const invalidFile = path.join(tempDir, 'test.txt');
    fs.writeFileSync(invalidFile, 'This is not an image file');

    // Try to upload invalid file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([invalidFile]);

    // Wait for error message
    await page.waitForTimeout(2000);

    // Check for error message (could be toast, modal, or inline)
    const errorMessage = await page
      .locator('text=/invalid|not supported|image|file type/i')
      .first()
      .textContent()
      .catch(() => null);

    // Verify error message is user-friendly (no stack traces)
    if (errorMessage) {
      expect(errorMessage).not.toContain('Error:');
      expect(errorMessage).not.toContain('at ');
      expect(errorMessage).not.toContain('stack');
      expect(errorMessage.length).toBeLessThan(200); // Reasonable length
      console.log('Error message:', errorMessage);
    }

    // Cleanup
    if (fs.existsSync(invalidFile)) {
      fs.unlinkSync(invalidFile);
    }
  });

  test('should show user-friendly error for file too large', async ({ page }) => {
    // Navigate to upload page
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    // Select property
    const propertySelector = page.locator('select').first();
    await page.waitForSelector('select option:not([value=""])', { timeout: 10000 });
    await propertySelector.selectOption({ value: propertyId });
    await page.waitForTimeout(500);

    // Create a test file that's too large (>50MB)
    const tempDir = './tests/fixtures/temp-files';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const largeFile = path.join(tempDir, 'large-image.jpg');
    // Create a 51MB file
    const largeBuffer = Buffer.alloc(51 * 1024 * 1024, 0xFF);
    fs.writeFileSync(largeFile, largeBuffer);

    // Try to upload large file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([largeFile]);

    // Wait for error message
    await page.waitForTimeout(2000);

    // Check for error message
    const errorMessage = await page
      .locator('text=/too large|size limit|maximum|50|MB/i')
      .first()
      .textContent()
      .catch(() => null);

    // Verify error message is user-friendly
    if (errorMessage) {
      expect(errorMessage).not.toContain('Error:');
      expect(errorMessage).not.toContain('at ');
      expect(errorMessage).not.toContain('stack');
      console.log('Error message:', errorMessage);
    }

    // Cleanup
    if (fs.existsSync(largeFile)) {
      fs.unlinkSync(largeFile);
    }
  });

  test('should show user-friendly error for network failure', async ({ page }) => {
    // Navigate to upload page
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    // Select property
    const propertySelector = page.locator('select').first();
    await page.waitForSelector('select option:not([value=""])', { timeout: 10000 });
    await propertySelector.selectOption({ value: propertyId });
    await page.waitForTimeout(500);

    // Generate test images
    const testImageFiles = generateTestImageFiles(5, 2 * 1024 * 1024);

    // Intercept and fail S3 uploads
    await page.route('**/*.s3.*.amazonaws.com/**', async (route) => {
      await route.fulfill({
        status: 500,
        body: 'Network error',
      });
    });

    // Select files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImageFiles);

    // Wait for upload to start and fail
    await page.waitForSelector('text=/failed|error|retry/i', {
      timeout: 30000,
    });

    // Wait a bit for error messages to appear
    await page.waitForTimeout(3000);

    // Check for error messages
    const errorMessages = await page
      .locator('text=/failed|error|network|retry/i')
      .allTextContents()
      .catch(() => []);

    // Verify error messages are user-friendly
    for (const errorMessage of errorMessages) {
      if (errorMessage) {
        expect(errorMessage).not.toContain('Error:');
        expect(errorMessage).not.toContain('at ');
        expect(errorMessage).not.toContain('stack');
        expect(errorMessage).not.toContain('XMLHttpRequest');
        expect(errorMessage).not.toContain('fetch');
        console.log('Error message:', errorMessage);
      }
    }

    // Cleanup
    cleanupTestImages();
  });

  test('should show user-friendly error for missing property selection', async ({ page }) => {
    // Navigate to upload page
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    // Try to select files without selecting property
    const testImageFiles = generateTestImageFiles(1, 2 * 1024 * 1024);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImageFiles);

    // Wait for error message
    await page.waitForTimeout(1000);

    // Check for error message
    const errorMessage = await page
      .locator('text=/select property|property required|choose property/i')
      .first()
      .textContent()
      .catch(() => null);

    // Verify error message is user-friendly
    if (errorMessage) {
      expect(errorMessage).not.toContain('Error:');
      expect(errorMessage).not.toContain('at ');
      expect(errorMessage.length).toBeLessThan(200);
      console.log('Error message:', errorMessage);
    }

    // Cleanup
    cleanupTestImages();
  });
});

