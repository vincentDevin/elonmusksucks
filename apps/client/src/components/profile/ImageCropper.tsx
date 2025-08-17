import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  className?: string;
}

// Helper function to create a circular crop that fits the image
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel, className }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [isLoading, setIsLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1)); // 1:1 aspect ratio for circular crop
  }, []);

  const handleCropComplete = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      return;
    }

    setIsLoading(true);

    try {
      const canvas = canvasRef.current;
      const image = imgRef.current;
      const crop = completedCrop;

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Set canvas size to match crop area
      const cropWidth = crop.width * scaleX;
      const cropHeight = crop.height * scaleY;

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create circular clipping path
      ctx.save();
      ctx.beginPath();
      ctx.arc(cropWidth / 2, cropHeight / 2, Math.min(cropWidth, cropHeight) / 2, 0, 2 * Math.PI);
      ctx.clip();

      // Draw the cropped image
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight,
      );

      ctx.restore();

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
          }
        },
        'image/jpeg',
        0.9, // High quality
      );
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsLoading(false);
    }
  }, [completedCrop, onCropComplete]);

  return (
    <div className={`bg-surface rounded-lg p-6 space-y-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-content mb-2">Crop Your Profile Picture</h3>
        <p className="text-sm text-tertiary">
          Drag to reposition and resize your image. The cropped area will be used as your circular
          profile picture.
        </p>
      </div>

      <div className="relative max-w-md mx-auto">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={1} // 1:1 aspect ratio for square crop (will be made circular)
          circularCrop // This adds visual circular overlay
          className="max-w-full"
        >
          <img
            ref={imgRef}
            alt="Crop me"
            src={imageSrc}
            style={{ maxHeight: '400px', maxWidth: '100%' }}
            onLoad={onImageLoad}
            className="block"
          />
        </ReactCrop>
      </div>

      {/* Preview canvas (hidden) */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Action buttons */}
      <div className="flex justify-center space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-tertiary hover:text-content transition-colors border border-muted rounded-md hover:border-secondary"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCropComplete}
          disabled={!completedCrop || isLoading}
          className="px-6 py-2 bg-primary text-white rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Use This Image'}
        </button>
      </div>

      {/* Help text */}
      <div className="text-xs text-tertiary text-center space-y-1">
        <p>• Drag the corners to resize the crop area</p>
        <p>• Drag inside the crop area to reposition</p>
        <p>• The final image will be circular</p>
      </div>
    </div>
  );
}
