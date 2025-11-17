/**
 * Photo fixture helpers for E2E tests
 */

import { Page } from '@playwright/test';
import { API_ENDPOINTS } from '../helpers/testData';
import * as fs from 'fs';
import * as path from 'path';

export interface PhotoFixture {
  photoId: string;
  propertyId: string;
  filename: string;
  s3Key: string;
  s3Bucket: string;
  uploadedAt: string;
  fileSize: number;
  status: 'pending' | 'uploaded' | 'failed';
  contentType: string;
}

/**
 * Generate a test image file
 */
export function createTestImageFile(
  filename: string,
  sizeBytes: number = 2 * 1024 * 1024, // 2 MB default
  outputDir: string = './tests/fixtures/temp-images'
): string {
  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, filename);

  // Create a minimal valid JPEG file
  // JPEG header
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);

  // Create padding to reach target size
  const paddingSize = Math.max(0, sizeBytes - jpegHeader.length - 2);
  const padding = Buffer.alloc(paddingSize, 0xFF);

  // JPEG footer
  const jpegFooter = Buffer.from([0xFF, 0xD9]);

  const imageData = Buffer.concat([jpegHeader, padding, jpegFooter]);
  fs.writeFileSync(filePath, imageData);

  return filePath;
}

/**
 * Generate multiple test image files
 */
export function generateTestImageFiles(
  count: number,
  sizeBytes: number = 2 * 1024 * 1024,
  outputDir: string = './tests/fixtures/temp-images'
): string[] {
  const files: string[] = [];

  for (let i = 0; i < count; i++) {
    const filename = `test-image-${String(i).padStart(4, '0')}.jpg`;
    const filePath = createTestImageFile(filename, sizeBytes, outputDir);
    files.push(filePath);
  }

  return files;
}

/**
 * Get presigned URL for photo upload
 */
export async function getPresignedUrl(
  page: Page,
  propertyId: string,
  filename: string,
  contentType: string = 'image/jpeg',
  fileSize: number = 2 * 1024 * 1024
): Promise<{ photoId: string; uploadUrl: string; expiresIn: number }> {
  // Use backend API URL directly, not frontend baseURL
  const backendURL = process.env.BACKEND_URL || 'http://localhost:8080';
  const apiURL = `${backendURL}${API_ENDPOINTS.PRESIGNED_URL}`;

  const response = await page.request.post(apiURL, {
    data: {
      propertyId,
      filename,
      contentType,
      fileSize,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    const error = await response.text();
    throw new Error(`Failed to get presigned URL: ${response.status()} ${error}`);
  }

  return (await response.json()) as { photoId: string; uploadUrl: string; expiresIn: number };
}

/**
 * Upload photo to S3 using presigned URL
 */
export async function uploadPhotoToS3(
  page: Page,
  presignedUrl: string,
  filePath: string
): Promise<void> {
  const fileContent = fs.readFileSync(filePath);

  const response = await page.request.put(presignedUrl, {
    data: fileContent,
    headers: {
      'Content-Type': 'image/jpeg',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to upload to S3: ${response.status()} ${response.statusText()}`);
  }
}

/**
 * Confirm photo upload
 */
export async function confirmPhotoUpload(
  page: Page,
  photoId: string,
  propertyId: string,
  s3Key: string
): Promise<PhotoFixture> {
  // Use backend API URL directly, not frontend baseURL
  const backendURL = process.env.BACKEND_URL || 'http://localhost:8080';
  const apiURL = `${backendURL}${API_ENDPOINTS.CONFIRM_UPLOAD}`;

  const response = await page.request.post(apiURL, {
    data: {
      photoId,
      propertyId,
      s3Key,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    const error = await response.text();
    throw new Error(`Failed to confirm upload: ${response.status()} ${error}`);
  }

  return (await response.json()) as PhotoFixture;
}

/**
 * Get photo by ID
 */
export async function getPhoto(
  page: Page,
  photoId: string
): Promise<PhotoFixture> {
  // Use backend API URL directly, not frontend baseURL
  const backendURL = process.env.BACKEND_URL || 'http://localhost:8080';
  const apiURL = `${backendURL}${API_ENDPOINTS.PHOTOS}/${photoId}`;

  const response = await page.request.get(apiURL);

  if (!response.ok()) {
    throw new Error(`Failed to get photo: ${response.status()} ${response.statusText()}`);
  }

  return (await response.json()) as PhotoFixture;
}

/**
 * Clean up temporary test images
 */
export function cleanupTestImages(outputDir: string = './tests/fixtures/temp-images'): void {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

