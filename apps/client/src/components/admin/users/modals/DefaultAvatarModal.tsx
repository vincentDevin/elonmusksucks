import React, { useState, useRef, useEffect } from 'react';
import { getDefaultAvatar, uploadDefaultAvatar, deleteDefaultAvatar } from '../../../../api/admin';
import { ImageCropper } from '../../../profile/ImageCropper';

interface DefaultAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const fallbackAvatar =
  'https://ui-avatars.com/api/?name=Default&background=64748b&color=fff&size=200';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const DefaultAvatarModal: React.FC<DefaultAvatarModalProps> = ({ isOpen, onClose }) => {
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showCropper, setShowCropper] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadDefaultAvatar();
    }
  }, [isOpen]);

  const loadDefaultAvatar = async () => {
    setIsLoading(true);
    try {
      const result = await getDefaultAvatar();
      setCurrentAvatarUrl(result.avatarUrl);
    } catch (err) {
      console.error('Failed to load default avatar:', err);
      setCurrentAvatarUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

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
      const file = new File([blob], selectedFile.name, { type: blob.type });
      const result = await uploadDefaultAvatar(file);

      setSuccess('Default avatar updated successfully!');
      setCurrentAvatarUrl(result.avatarUrl);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete the default avatar? Users without custom avatars will see initials instead.',
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await deleteDefaultAvatar();
      setSuccess('Default avatar deleted successfully.');
      setCurrentAvatarUrl(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete default avatar');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleButtonClick = () => {
    if (isUploading || isDeleting) return;
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  if (showCropper && previewUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-surface rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4">
          <div className="p-6">
            <ImageCropper
              imageSrc={previewUrl}
              onCropComplete={handleCropComplete}
              onCancel={handleCropCancel}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-content">Default Avatar Settings</h2>
            <p className="text-sm text-tertiary mt-1">
              Set the default profile image for users without custom avatars
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-accent transition-colors text-content"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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

          {/* Avatar Preview */}
          <div className="bg-background rounded-lg p-6 border border-border">
            <h3 className="text-base font-medium text-content mb-4">Current Default Avatar</h3>

            <div className="flex items-center gap-6">
              <div className="relative">
                {isLoading ? (
                  <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-muted overflow-hidden border-4 border-muted shadow-lg">
                    <img
                      src={currentAvatarUrl || fallbackAvatar}
                      alt="Default avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = fallbackAvatar;
                      }}
                    />
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-xs font-medium">Uploading...</div>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleButtonClick}
                    disabled={isUploading || isDeleting || isLoading}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Upload New'}
                  </button>

                  {currentAvatarUrl && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isUploading || isDeleting || isLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleFileSelect}
                  disabled={isUploading || isDeleting || isLoading}
                />

                <div className="text-xs text-tertiary space-y-1">
                  <p>• JPEG, PNG, or WebP format</p>
                  <p>• Maximum 5MB file size</p>
                </div>

                {!currentAvatarUrl && !isLoading && (
                  <div className="text-sm text-tertiary italic">
                    No default avatar set. Users will see initials-based avatars.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-xl">ℹ️</div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1 text-sm">About Default Avatars</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Shown for all users without custom avatars</li>
                  <li>• Changes take effect immediately site-wide</li>
                  <li>• Stored securely in S3 storage</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-surface flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-muted text-content rounded-lg hover:bg-accent transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DefaultAvatarModal;
