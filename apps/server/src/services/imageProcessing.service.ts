import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface ProcessedImage {
  buffer: Buffer;
  filename: string;
  contentType: string;
  size: number;
}

export interface ProcessedImageSizes {
  thumbnail: ProcessedImage;
  profile: ProcessedImage;
  full: ProcessedImage;
}

export class ImageProcessingService {
  private static readonly SIZES = {
    thumbnail: { width: 100, height: 100 },
    profile: { width: 200, height: 200 },
    full: { width: 400, height: 400 },
  };

  private static readonly QUALITY = 85;
  private static readonly OUTPUT_FORMAT = 'webp';

  /**
   * Processes an uploaded image into multiple optimized sizes
   */
  static async processProfileImage(
    inputBuffer: Buffer,
    userId: number,
  ): Promise<ProcessedImageSizes> {
    // Generate unique identifier for this image set
    const imageId = uuidv4();

    // Create Sharp instance from input buffer
    const image = sharp(inputBuffer);

    // Get image metadata to ensure it's valid
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image file: unable to read image dimensions');
    }

    // Remove EXIF data and prepare base processing pipeline
    const baseProcessing = image
      .rotate() // Auto-rotate based on EXIF orientation
      .withMetadata({}) // Remove EXIF and other metadata
      .toFormat(this.OUTPUT_FORMAT, { quality: this.QUALITY });

    // Process each size
    const results = await Promise.all([
      this.processSize(baseProcessing.clone(), 'thumbnail', imageId, userId),
      this.processSize(baseProcessing.clone(), 'profile', imageId, userId),
      this.processSize(baseProcessing.clone(), 'full', imageId, userId),
    ]);

    return {
      thumbnail: results[0],
      profile: results[1],
      full: results[2],
    };
  }

  /**
   * Processes a single size variant
   */
  private static async processSize(
    sharpInstance: sharp.Sharp,
    sizeName: keyof typeof ImageProcessingService.SIZES,
    imageId: string,
    userId: number,
  ): Promise<ProcessedImage> {
    const { width, height } = this.SIZES[sizeName];

    // Resize with smart cropping to maintain aspect ratio
    const buffer = await sharpInstance
      .resize(width, height, {
        fit: 'cover', // Crop to fill the dimensions
        position: 'center', // Focus on center of image
      })
      .toBuffer();

    const filename = `profiles/${userId}/${sizeName}-${imageId}.${this.OUTPUT_FORMAT}`;

    return {
      buffer,
      filename,
      contentType: `image/${this.OUTPUT_FORMAT}`,
      size: buffer.length,
    };
  }

  /**
   * Validates that the input buffer is a valid image
   */
  static async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!(metadata.width && metadata.height && metadata.format);
    } catch {
      return false;
    }
  }

  /**
   * Gets image metadata without processing
   */
  static async getImageInfo(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new Error('Invalid image file');
    }

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length,
    };
  }

  /**
   * Creates a base64 preview thumbnail for immediate client feedback
   */
  static async createPreviewThumbnail(buffer: Buffer): Promise<string> {
    const thumbnail = await sharp(buffer)
      .resize(96, 96, { fit: 'cover', position: 'center' })
      .toFormat('jpeg', { quality: 70 })
      .toBuffer();

    return `data:image/jpeg;base64,${thumbnail.toString('base64')}`;
  }
}
