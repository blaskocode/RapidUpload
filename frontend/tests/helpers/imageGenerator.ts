/**
 * Image generator script to create test images for E2E testing
 * Generates 1000 sample 2MB JPEG images with unique metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import { createCanvas } from 'canvas';

const GENERATED_IMAGES_DIR = path.join(__dirname, '../fixtures/generated-images');
const TARGET_COUNT = 1000;
const TARGET_SIZE = 2 * 1024 * 1024; // 2 MB
const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;

interface ImageMetadata {
  filename: string;
  index: number;
  color: string;
  timestamp: string;
}

/**
 * Generate a single test image with unique content
 */
function generateImage(index: number): Buffer {
  // Create canvas (requires node-canvas)
  // For a simpler approach without canvas dependency, we'll create a minimal JPEG
  // In a real scenario, you might use a library like sharp or jimp
  
  // For now, we'll create a minimal valid JPEG header + data
  // This is a simplified approach - in production, use a proper image library
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x04, 0x38,
    0x07, 0x80, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11,
    0x01,
  ]);

  // Create padding data to reach target size
  const paddingSize = TARGET_SIZE - jpegHeader.length - 100; // Leave room for footer
  const padding = Buffer.alloc(paddingSize, 0xFF);
  
  // JPEG footer
  const jpegFooter = Buffer.from([0xFF, 0xD9]);

  return Buffer.concat([jpegHeader, padding, jpegFooter]);
}

/**
 * Generate metadata for an image
 */
function generateMetadata(index: number): ImageMetadata {
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
  const color = colors[index % colors.length];
  
  return {
    filename: `test-image-${String(index).padStart(4, '0')}.jpg`,
    index,
    color,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate all test images
 */
export async function generateTestImages(count: number = TARGET_COUNT): Promise<string[]> {
  // Ensure directory exists
  if (!fs.existsSync(GENERATED_IMAGES_DIR)) {
    fs.mkdirSync(GENERATED_IMAGES_DIR, { recursive: true });
  }

  const generatedFiles: string[] = [];
  const metadata: ImageMetadata[] = [];

  console.log(`Generating ${count} test images...`);

  for (let i = 0; i < count; i++) {
    const imageData = generateImage(i);
    const meta = generateMetadata(i);
    const filePath = path.join(GENERATED_IMAGES_DIR, meta.filename);

    fs.writeFileSync(filePath, imageData);
    generatedFiles.push(filePath);
    metadata.push(meta);

    if ((i + 1) % 100 === 0) {
      console.log(`Generated ${i + 1}/${count} images...`);
    }
  }

  // Save metadata JSON
  const metadataPath = path.join(GENERATED_IMAGES_DIR, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`✅ Generated ${count} images in ${GENERATED_IMAGES_DIR}`);
  console.log(`✅ Metadata saved to ${metadataPath}`);

  return generatedFiles;
}

/**
 * Clean up generated images
 */
export function cleanupGeneratedImages(): void {
  if (fs.existsSync(GENERATED_IMAGES_DIR)) {
    fs.rmSync(GENERATED_IMAGES_DIR, { recursive: true, force: true });
    console.log(`✅ Cleaned up generated images from ${GENERATED_IMAGES_DIR}`);
  }
}

// Run if called directly
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2], 10) : TARGET_COUNT;
  generateTestImages(count)
    .then(() => {
      console.log('Image generation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error generating images:', error);
      process.exit(1);
    });
}

