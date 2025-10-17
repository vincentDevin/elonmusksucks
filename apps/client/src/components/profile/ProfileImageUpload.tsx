import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ImageCropper } from './ImageCropper';
import { uploadProfileImage } from '../../api/users';
import api from '../../api/axios';

interface ProfileImageUploadProps {
  userId: number;
  currentAvatarUrl?: string | null;
  onUploadSuccess: (result: {
    avatarUrl: string;
    sizes: {
      thumbnail: string;
      profile: string;
      full: string;
    };
  }) => void;
  onUploadError: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

const fallbackAvatar =
  'https://ui-avatars.com/api/?name=Unknown&background=64748b&color=fff&size=200';

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ProfileImageUpload({
  userId,
  currentAvatarUrl,
  onUploadSuccess,
  onUploadError,
  className,
  disabled = false,
}: ProfileImageUploadProps) {
  const { accessToken } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please select a JPEG, PNG, or WebP image file.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      onUploadError(error);
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setShowCropper(true);
  };

  const handleCropComplete = (blob: Blob) => {
    setShowCropper(false);
    // Upload the cropped image immediately
    uploadCroppedImage(blob);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadCroppedImage = async (blob: Blob) => {
    if (!selectedFile) {
      onUploadError('No file selected');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create a File object from the blob
      const file = new File([blob], selectedFile.name, { type: blob.type });

      // Use the API function which has the correct baseURL configured
      const imageUrl = await uploadProfileImage(userId, file);

      // Format the response to match expected structure
      onUploadSuccess({
        avatarUrl: imageUrl,
        sizes: {
          thumbnail: imageUrl,
          profile: imageUrl,
          full: imageUrl,
        },
      });

      // Cleanup
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
      setSelectedFile(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleButtonClick = () => {
    if (disabled || isUploading || isDeleting) return;
    fileInputRef.current?.click();
  };

  const handleUseDefault = async () => {
    if (!confirm('Use the site default avatar? This will remove your custom profile picture.')) {
      return;
    }

    setIsDeleting(true);

    try {
      // Use the axios instance which has the correct baseURL configured
      await api.delete(`/api/users/${userId}/profile-picture`);

      // Notify parent of success - need to refresh to get the new default avatar URL
      window.location.reload();
    } catch (error) {
      console.error('Delete avatar error:', error);
      onUploadError(error instanceof Error ? error.message : 'Failed to reset avatar');
    } finally {
      setIsDeleting(false);
    }
  };

  if (showCropper && previewUrl) {
    return (
      <ImageCropper
        imageSrc={previewUrl}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-4">
        {/* Avatar Preview */}
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-muted overflow-hidden flex-shrink-0 border-2 border-muted">
            <img
              src={currentAvatarUrl || fallbackAvatar}
              alt="Profile picture"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = fallbackAvatar;
              }}
            />
          </div>
          {isUploading && (
            <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-xs font-medium">
                {uploadProgress > 0 ? `${uploadProgress}%` : '...'}
              </div>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleButtonClick}
              disabled={disabled || isUploading || isDeleting}
              className="inline-flex items-center px-4 py-2 bg-surface text-content shadow-sm border border-muted rounded-md cursor-pointer hover:bg-muted hover:border-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                'Change Picture'
              )}
            </button>

            <button
              type="button"
              onClick={handleUseDefault}
              disabled={disabled || isUploading || isDeleting}
              className="inline-flex items-center px-4 py-2 bg-surface text-content shadow-sm border border-muted rounded-md cursor-pointer hover:bg-muted hover:border-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Setting...' : 'Use Default'}
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleFileSelect}
              disabled={disabled || isUploading || isDeleting}
            />
          </div>

          {/* Upload progress */}
          {isUploading && uploadProgress > 0 && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Help text */}
          <div className="text-xs text-tertiary space-y-1">
            <p>• JPEG, PNG, or WebP format</p>
            <p>• Maximum 5MB file size</p>
            <p>• Square images work best</p>
          </div>
        </div>
      </div>
    </div>
  );
}
