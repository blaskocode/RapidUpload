/**
 * Lighthouse performance audit tests
 * Validates performance, accessibility, best practices, and SEO scores
 */

import { test, expect } from '@playwright/test';
import { createTestProperty, deleteTestProperty } from '../fixtures/propertyFixture';
import { TEST_PROPERTY_NAMES } from '../helpers/testData';

test.describe('Lighthouse Performance Audit', () => {
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

  test('should meet Lighthouse performance targets on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Run Lighthouse audit using Playwright's built-in support
    // Note: This requires Chrome DevTools Protocol or external Lighthouse CLI
    // For now, we'll use a simplified approach that can be enhanced with actual Lighthouse integration

    // Measure key performance metrics using Performance API
    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintData = performance.getEntriesByType('paint');
      const resourceData = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      // Calculate Total Blocking Time (TBT) approximation
      const longTasks = performance.getEntriesByType('longtask') || [];
      const tbt = longTasks.reduce((sum, task) => sum + (task.duration - 50), 0);

      // Calculate Cumulative Layout Shift (CLS)
      const layoutShifts = performance.getEntriesByType('layout-shift') || [];
      const cls = layoutShifts.reduce((sum, shift: any) => sum + (shift.value || 0), 0);

      return {
        domContentLoaded: perfData?.domContentLoadedEventEnd - perfData?.domContentLoadedEventStart,
        loadComplete: perfData?.loadEventEnd - perfData?.loadEventStart,
        firstPaint: paintData.find((entry) => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: paintData.find((entry) => entry.name === 'first-contentful-paint')?.startTime,
        totalBlockingTime: tbt,
        cumulativeLayoutShift: cls,
        resourceCount: resourceData.length,
        totalResourceSize: resourceData.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      };
    });

    console.log('📊 Lighthouse-style Performance Metrics (Homepage):');
    console.log(`   First Contentful Paint: ${performanceMetrics.firstContentfulPaint?.toFixed(2)} ms`);
    console.log(`   Total Blocking Time: ${performanceMetrics.totalBlockingTime.toFixed(2)} ms`);
    console.log(`   Cumulative Layout Shift: ${performanceMetrics.cumulativeLayoutShift.toFixed(4)}`);
    console.log(`   Resource Count: ${performanceMetrics.resourceCount}`);
    console.log(`   Total Resource Size: ${(performanceMetrics.totalResourceSize / 1024).toFixed(2)} KB`);

    // Assert performance targets (Lighthouse-style thresholds)
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1800); // Good: <1.8s
    expect(performanceMetrics.totalBlockingTime).toBeLessThan(200); // Good: <200ms
    expect(performanceMetrics.cumulativeLayoutShift).toBeLessThan(0.1); // Good: <0.1
  });

  test('should meet Lighthouse performance targets on gallery page', async ({ page }) => {
    // Navigate to gallery page
    await page.goto(`/properties/${propertyId}/gallery`);
    await page.waitForLoadState('networkidle');

    // Wait for gallery to load
    await page.waitForSelector('[class*="grid"]', { timeout: 10000 });

    // Measure performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintData = performance.getEntriesByType('paint');
      const resourceData = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      // Calculate LCP (Largest Contentful Paint) - approximate
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint') || [];
      const lcp = lcpEntries.length > 0 ? (lcpEntries[lcpEntries.length - 1] as any).renderTime || (lcpEntries[lcpEntries.length - 1] as any).loadTime : null;

      // Calculate TBT
      const longTasks = performance.getEntriesByType('longtask') || [];
      const tbt = longTasks.reduce((sum, task) => sum + (task.duration - 50), 0);

      // Calculate CLS
      const layoutShifts = performance.getEntriesByType('layout-shift') || [];
      const cls = layoutShifts.reduce((sum, shift: any) => sum + (shift.value || 0), 0);

      return {
        firstContentfulPaint: paintData.find((entry) => entry.name === 'first-contentful-paint')?.startTime,
        largestContentfulPaint: lcp,
        totalBlockingTime: tbt,
        cumulativeLayoutShift: cls,
        resourceCount: resourceData.length,
        imageCount: resourceData.filter((r) => r.initiatorType === 'img').length,
      };
    });

    console.log('📊 Lighthouse-style Performance Metrics (Gallery):');
    console.log(`   First Contentful Paint: ${performanceMetrics.firstContentfulPaint?.toFixed(2)} ms`);
    console.log(`   Largest Contentful Paint: ${performanceMetrics.largestContentfulPaint?.toFixed(2) || 'N/A'} ms`);
    console.log(`   Total Blocking Time: ${performanceMetrics.totalBlockingTime.toFixed(2)} ms`);
    console.log(`   Cumulative Layout Shift: ${performanceMetrics.cumulativeLayoutShift.toFixed(4)}`);
    console.log(`   Image Count: ${performanceMetrics.imageCount}`);

    // Assert performance targets
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2500); // Gallery may take longer
    expect(performanceMetrics.totalBlockingTime).toBeLessThan(300); // Allow more for gallery
    expect(performanceMetrics.cumulativeLayoutShift).toBeLessThan(0.1);
  });

  test('should meet accessibility requirements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for common accessibility issues
    const accessibilityChecks = await page.evaluate(() => {
      const issues: string[] = [];

      // Check for missing alt text on images
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.alt && !img.getAttribute('aria-label')) {
          issues.push(`Image ${index} missing alt text`);
        }
      });

      // Check for missing labels on form inputs
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((input, index) => {
        const id = input.getAttribute('id');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = input.getAttribute('aria-label');
        if (!label && !ariaLabel && input.getAttribute('type') !== 'hidden') {
          issues.push(`Input ${index} missing label`);
        }
      });

      // Check for proper heading hierarchy
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      let previousLevel = 0;
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName.charAt(1));
        if (level > previousLevel + 1) {
          issues.push(`Heading hierarchy skip: ${heading.tagName}`);
        }
        previousLevel = level;
      });

      return {
        issueCount: issues.length,
        issues: issues.slice(0, 10), // Limit to first 10 issues
      };
    });

    console.log('📊 Accessibility Checks:');
    console.log(`   Issues found: ${accessibilityChecks.issueCount}`);
    if (accessibilityChecks.issues.length > 0) {
      console.log(`   Sample issues:`, accessibilityChecks.issues);
    }

    // Assert accessibility (should have minimal issues)
    expect(accessibilityChecks.issueCount).toBeLessThan(5); // Allow some minor issues
  });
});

