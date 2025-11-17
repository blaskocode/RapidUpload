/**
 * Property fixture helpers for E2E tests
 */

import { Page } from '@playwright/test';
import { API_ENDPOINTS, TEST_PROPERTY_NAMES } from '../helpers/testData';

export interface PropertyFixture {
  propertyId: string;
  name: string;
  createdAt: string;
  photoCount: number;
}

/**
 * Create a test property via API
 */
export async function createTestProperty(
  page: Page,
  name: string = TEST_PROPERTY_NAMES.DEFAULT
): Promise<PropertyFixture> {
  // Use backend API URL directly, not frontend baseURL
  const backendURL = process.env.BACKEND_URL || 'http://localhost:8080';
  const apiURL = `${backendURL}${API_ENDPOINTS.PROPERTIES}`;

  const response = await page.request.post(apiURL, {
    data: { name },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create property: ${response.status()} ${response.statusText()}`);
  }

  const property = await response.json();
  return property as PropertyFixture;
}

/**
 * Create a test property via UI
 */
export async function createPropertyViaUI(
  page: Page,
  name: string = TEST_PROPERTY_NAMES.DEFAULT
): Promise<string> {
  // Navigate to home page
  await page.goto('/');

  // Click "Create Property" button
  await page.click('button:has-text("Create Property"), button:has-text("New Property")');

  // Wait for modal/form to appear
  await page.waitForSelector('input[type="text"], input[name="name"]', { timeout: 5000 });

  // Fill in property name
  await page.fill('input[type="text"], input[name="name"]', name);

  // Submit form
  await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');

  // Wait for property to be created and get property ID from URL or response
  // This depends on your app's navigation flow
  await page.waitForURL(/\/properties\/[^/]+/, { timeout: 10000 });

  // Extract property ID from URL
  const url = page.url();
  const match = url.match(/\/properties\/([^/]+)/);
  if (!match) {
    throw new Error('Could not extract property ID from URL');
  }

  return match[1];
}

/**
 * Get property by ID via API
 */
export async function getProperty(
  page: Page,
  propertyId: string
): Promise<PropertyFixture> {
  // Use backend API URL directly, not frontend baseURL
  const backendURL = process.env.BACKEND_URL || 'http://localhost:8080';
  const apiURL = `${backendURL}${API_ENDPOINTS.PROPERTIES}/${propertyId}`;

  const response = await page.request.get(apiURL);

  if (!response.ok()) {
    throw new Error(`Failed to get property: ${response.status()} ${response.statusText()}`);
  }

  return (await response.json()) as PropertyFixture;
}

/**
 * Delete a test property via API (cleanup)
 * Note: This may not be available if the backend doesn't implement DELETE endpoint
 */
export async function deleteTestProperty(
  page: Page,
  propertyId: string
): Promise<void> {
  try {
    // Use backend API URL directly, not frontend baseURL
    const backendURL = process.env.BACKEND_URL || 'http://localhost:8080';
    const apiURL = `${backendURL}${API_ENDPOINTS.PROPERTIES}/${propertyId}`;

    const response = await page.request.delete(apiURL);

    // If DELETE is not implemented (405 Method Not Allowed), that's okay for cleanup
    if (!response.ok() && response.status() !== 404 && response.status() !== 405) {
      console.warn(`Failed to delete property: ${response.status()} ${response.statusText()}`);
    }
  } catch (error) {
    // Silently fail - cleanup is best effort
    console.warn('Property deletion not available or failed:', error);
  }
}

/**
 * List all properties via API
 */
export async function listProperties(page: Page): Promise<PropertyFixture[]> {
  // Use backend API URL directly, not frontend baseURL
  const backendURL = process.env.BACKEND_URL || 'http://localhost:8080';
  const apiURL = `${backendURL}${API_ENDPOINTS.PROPERTIES}`;

  const response = await page.request.get(apiURL);

  if (!response.ok()) {
    throw new Error(`Failed to list properties: ${response.status()} ${response.statusText()}`);
  }

  return (await response.json()) as PropertyFixture[];
}

