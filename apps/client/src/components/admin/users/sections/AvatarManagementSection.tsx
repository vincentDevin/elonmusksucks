import React, { useState, useRef } from 'react';
import { uploadUserProfileImage, deleteUserProfileImage } from '../../../../api/admin';
import { ImageCropper } from '../../../profile/ImageCropper';

interface AvatarManagementSectionProps {
  userId: number;
  userName?: string;
  currentAvatarUrl?: string | null;
  onUpdate: () => void;
}

const fallbackAvatar =
  'https://ui-avatars.com/api/?name=Unknown&background=64748b&color=fff&size=200';

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const AvatarManagementSection: React.FC<AvatarManagementSectionProps> = ({
  userId,
  userName,
  currentAvatarUrl,
  onUpdate,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showCropper, setShowCropper] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAIUser = userId < 0;

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

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }

    setSelectedFile(file);
    setError('');
    setSuccess('');

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setShowCropper(true);
  };

  const handleCropComplete = async (blob: Blob) => {
    setShowCropper(false);
    await uploadCroppedImage(blob);
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
      setError('No file selected');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      // Convert blob to File
      const file = new File([blob], selectedFile.name, { type: blob.type });

      // Upload via admin API
      await uploadUserProfileImage(userId, file);

      setSuccess('Profile image updated successfully');

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

      // Refresh parent data
      onUpdate();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetToDefault = async () => {
    if (
      !confirm(
        `Are you sure you want to reset ${userName || 'this user'}'s profile picture to default?`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await deleteUserProfileImage(userId);
      setSuccess('Profile image reset to default successfully');
      onUpdate();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset profile image');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleButtonClick = () => {
    if (isUploading || isDeleting) return;
    fileInputRef.current?.click();
  };

  if (showCropper && previewUrl) {
    return (
      <div className="p-6">
        <ImageCropper
          imageSrc={previewUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-content">Avatar Management</h3>
        {isAIUser && (
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
            AI User
          </span>
        )}
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-xl">❌</div>
            <div className="flex-1">
              <h4 className="font-medium text-red-900 mb-1">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-xl">✅</div>
            <div className="flex-1">
              <h4 className="font-medium text-green-900 mb-1">Success</h4>
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Preview & Controls */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <div className="flex items-center gap-6">
          {/* Avatar Preview */}
          <div className="relative">
            <div className="h-32 w-32 rounded-full bg-muted overflow-hidden flex-shrink-0 border-4 border-muted shadow-lg">
              <img
                src={currentAvatarUrl || fallbackAvatar}
                alt={userName || 'User avatar'}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = fallbackAvatar;
                }}
              />
            </div>
            {isUploading && (
              <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-xs font-medium">Uploading...</div>
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleButtonClick}
                disabled={isUploading || isDeleting}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
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
                  </span>
                ) : (
                  'Upload New Image'
                )}
              </button>

              <button
                type="button"
                onClick={handleSetToDefault}
                disabled={isUploading || isDeleting}
                className="px-4 py-2 bg-muted text-content rounded-lg hover:bg-border transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Resetting...' : 'Set to Default'}
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleFileSelect}
              disabled={isUploading || isDeleting}
            />

            {/* Help text */}
            <div className="text-xs text-tertiary space-y-1">
              <p>• JPEG, PNG, or WebP format</p>
              <p>• Maximum 5MB file size</p>
              <p>• Square images work best</p>
            </div>
          </div>
        </div>
      </div>

      {/* Guidelines */}
      <div className="bg-surface rounded-lg p-4 border border-border">
        <h4 className="font-medium text-content mb-3">Avatar Moderation Guidelines</h4>
        <ul className="space-y-2 text-sm text-tertiary">
          <li className="flex items-start gap-2">
            <span className="text-red-600">🚫</span>
            <span>Remove inappropriate, offensive, or explicit content immediately</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">⚠️</span>
            <span>Use "Set to Default" to reset problematic profile pictures</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">📝</span>
            <span>Upload replacement images for AI users or special accounts</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>Changes take effect immediately and clear all caches</span>
          </li>
        </ul>
      </div>

      {/* AI User Info */}
      {isAIUser && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h4 className="font-medium text-purple-900 mb-1">AI User Account</h4>
              <p className="text-sm text-purple-700">
                This is an AI pong user (negative user ID). You can upload custom profile images for
                AI opponents to give them distinct appearances.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h4 className="font-medium text-yellow-900 mb-1">Important</h4>
            <p className="text-sm text-yellow-700">
              Avatar changes are logged and auditable. Use this feature responsibly for content
              moderation and account management purposes only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarManagementSection;
