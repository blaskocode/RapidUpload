/**
 * Test data constants for E2E tests
 */

export const TEST_PROPERTY_NAMES = {
  DEFAULT: 'Test Property',
  LONG: 'A Very Long Property Name That Exceeds Normal Length Limits To Test Validation',
  SPECIAL_CHARS: 'Test Property & Co. (2024)',
  UNICODE: '测试属性 🏠',
};

export const TEST_PHOTO_COUNTS = {
  SMALL: 10,
  MEDIUM: 100,
  LARGE: 1000,
  STRESS: 5000,
};

export const TEST_FILE_SIZES = {
  SMALL: 100 * 1024, // 100 KB
  MEDIUM: 1024 * 1024, // 1 MB
  LARGE: 2 * 1024 * 1024, // 2 MB
  MAX: 50 * 1024 * 1024, // 50 MB (max allowed)
};

export const TEST_NETWORK_CONDITIONS = {
  '3G': {
    downloadThroughput: 750 * 1024, // 750 Kbps
    uploadThroughput: 250 * 1024, // 250 Kbps
    latency: 100, // 100ms
  },
  '4G': {
    downloadThroughput: 4 * 1024 * 1024, // 4 Mbps
    uploadThroughput: 3 * 1024 * 1024, // 3 Mbps
    latency: 50, // 50ms
  },
  FAST: {
    downloadThroughput: 25 * 1024 * 1024, // 25 Mbps
    uploadThroughput: 10 * 1024 * 1024, // 10 Mbps
    latency: 20, // 20ms
  },
};

export const TEST_TIMEOUTS = {
  SHORT: 5000, // 5 seconds
  MEDIUM: 30000, // 30 seconds
  LONG: 120000, // 2 minutes
  VERY_LONG: 300000, // 5 minutes
};

export const API_ENDPOINTS = {
  PROPERTIES: '/api/properties',
  PHOTOS: '/api/photos',
  PRESIGNED_URL: '/api/photos/presigned-url',
  CONFIRM_UPLOAD: '/api/photos/confirm',
};

export const TEST_IMAGES_DIR = './tests/fixtures/images';
export const GENERATED_IMAGES_DIR = './tests/fixtures/generated-images';

