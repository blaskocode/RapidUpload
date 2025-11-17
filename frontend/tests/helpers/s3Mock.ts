/**
 * S3 request mocking helpers for E2E tests
 */

import { Page, Route } from '@playwright/test';

export interface S3MockConfig {
  failureRate?: number; // 0-1, probability of failure
  failureStatus?: number; // HTTP status code for failures
  delay?: number; // Delay in milliseconds
  failSpecificRequests?: string[]; // Specific S3 keys to always fail
}

/**
 * Intercept S3 upload requests with configurable failures
 */
export function setupS3Mock(
  page: Page,
  config: S3MockConfig = {}
): Promise<void> {
  const {
    failureRate = 0,
    failureStatus = 500,
    delay = 0,
    failSpecificRequests = [],
  } = config;

  return page.route('**/*.s3.*.amazonaws.com/**', async (route: Route) => {
    const url = route.request().url();
    
    // Check if this specific request should fail
    const shouldFail = failSpecificRequests.some((key) => url.includes(key));
    
    // Random failure based on failure rate
    const randomFailure = Math.random() < failureRate;

    if (shouldFail || randomFailure) {
      // Simulate failure
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      await route.fulfill({
        status: failureStatus,
        body: 'Simulated S3 upload failure',
      });
    } else {
      // Allow request to proceed normally
      await route.continue();
    }
  });
}

/**
 * Remove S3 mock interceptors
 */
export async function removeS3Mock(page: Page): Promise<void> {
  await page.unroute('**/*.s3.*.amazonaws.com/**');
}

/**
 * Inject specific failures for testing retry logic
 */
export function injectS3Failures(
  page: Page,
  s3Keys: string[],
  failureStatus: number = 500
): Promise<void> {
  return page.route('**/*.s3.*.amazonaws.com/**', async (route: Route) => {
    const url = route.request().url();
    
    // Check if this S3 key should fail
    const shouldFail = s3Keys.some((key) => url.includes(key));

    if (shouldFail) {
      await route.fulfill({
        status: failureStatus,
        body: 'Injected S3 upload failure',
      });
    } else {
      await route.continue();
    }
  });
}

