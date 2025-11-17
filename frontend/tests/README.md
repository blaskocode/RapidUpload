# E2E Test Suite

This directory contains end-to-end tests for the RapidUpload application using Playwright.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. Generate test images (optional, for large-scale tests):
```bash
npm run test:generate-images 1000
```

## Running Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run tests with UI mode:
```bash
npm run test:e2e:ui
```

### Run tests in debug mode:
```bash
npm run test:e2e:debug
```

### Run performance tests:
```bash
npm run test:performance
```

### Run specific test file:
```bash
npx playwright test tests/e2e/complete-upload-flow.spec.ts
```

## Test Structure

- `tests/e2e/` - End-to-end test specifications
- `tests/performance/` - Performance benchmark tests
- `tests/fixtures/` - Test fixtures and helpers
- `tests/helpers/` - Utility functions and test data

## Fixtures

- `propertyFixture.ts` - Property creation and management helpers
- `photoFixture.ts` - Photo upload and management helpers
- `authFixture.ts` - Authentication helpers (placeholder for future use)
- `s3Mock.ts` - S3 request mocking for failure simulation

## Helpers

- `testData.ts` - Test constants and configuration
- `imageGenerator.ts` - Generate test image files

## Configuration

Test configuration is in `playwright.config.ts` at the project root.

## Test Data

Test images are generated in `tests/fixtures/generated-images/` when running the image generator.

