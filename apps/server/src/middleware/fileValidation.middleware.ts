import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// File magic number signatures for validation
const ALLOWED_FILE_SIGNATURES = {
  'image/jpeg': [
    [0xff, 0xd8, 0xff], // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // RIFF (WebP container)
  ],
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validates file magic numbers (first few bytes) to ensure file type matches MIME type
 */
function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signatures = ALLOWED_FILE_SIGNATURES[mimeType as keyof typeof ALLOWED_FILE_SIGNATURES];
  if (!signatures) return false;

  return signatures.some((signature) => {
    if (buffer.length < signature.length) return false;
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Sanitizes filename by removing dangerous characters and limiting length
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace unsafe chars with underscore
    .replace(/\.+/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, 100); // Limit length
}

/**
 * Enhanced file filter for Multer with security validation
 */
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type. Only JPEG, PNG, and WebP images are allowed.`));
  }

  // Sanitize filename
  file.originalname = sanitizeFilename(file.originalname);

  cb(null, true);
};

/**
 * Multer configuration with enhanced security
 */
export const uploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fieldSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

/**
 * Middleware to validate file magic numbers after upload
 */
export const validateFileContent = (req: Request, res: Response, next: NextFunction): void => {
  const file = req.file;

  if (!file) {
    next();
    return;
  }

  // Validate magic numbers
  if (!validateFileSignature(file.buffer, file.mimetype)) {
    res.status(400).json({
      error: 'File content does not match file type. The file may be corrupted or malicious.',
    });
    return;
  }

  // Additional size check (redundant but safe)
  if (file.size > MAX_FILE_SIZE) {
    res.status(400).json({
      error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    });
    return;
  }

  next();
};

/**
 * Error handler for Multer upload errors
 */
export const handleUploadError = (
  error: any,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(400).json({
          error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
        });
        return;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({
          error: 'Too many files. Only one file is allowed.',
        });
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({
          error: 'Unexpected file field. Use "image" as the field name.',
        });
        return;
      default:
        res.status(400).json({
          error: 'File upload error: ' + error.message,
        });
        return;
    }
  }

  if (error.message && error.message.includes('Invalid file type')) {
    res.status(400).json({
      error: error.message,
    });
    return;
  }

  next(error);
};
