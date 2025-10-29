import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '../api/users';
import type { UpdateProfilePayload } from '../api/users';
import { ProfileImageUpload } from '../components/profile/ProfileImageUpload';
import PageContainer from '../components/PageContainer';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ProfileSetup() {
  const { user: currentUser, refreshUser } = useAuth();
  const [formData, setFormData] = useState<UpdateProfilePayload>({
    bio: '',
    avatarUrl: '',
    notifyOnResolve: true,
    theme: 'dark-professional',
    twoFactorEnabled: false,
    profileComplete: false,
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    getUserProfile(currentUser.id)
      .then((profile) => {
        setFormData({
          bio: profile.bio ?? '',
          avatarUrl: profile.avatarUrl ?? '',
          notifyOnResolve: profile.notifyOnResolve,
          theme: profile.theme,
          twoFactorEnabled: profile.twoFactorEnabled,
          profileComplete: false,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => {
    if (!loading && formData.profileComplete) {
      window.location.href = '/timeline';
    }
  }, [loading, formData.profileComplete]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, type, value, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleUploadSuccess = (result: {
    avatarUrl: string;
    sizes: {
      thumbnail: string;
      profile: string;
      full: string;
    };
  }) => {
    setFormData((prev) => ({ ...prev, avatarUrl: result.avatarUrl }));
    setError(null);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (!currentUser?.id) throw new Error('User not authenticated');
      await updateUserProfile(currentUser.id, { ...formData, profileComplete: true });
      await refreshUser();
      window.location.href = '/timeline';
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to update profile';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  // Rollback: git checkout HEAD -- apps/client/src/pages/ProfileSetup.tsx
  if (loading) {
    return (
      <PageContainer>
        <div className="max-w-lg mx-auto p-8 bg-surface rounded-lg shadow-lg space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="space-y-4">
              <div className="h-32 bg-muted rounded-full w-32 mx-auto"></div>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-12 bg-muted rounded"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-24 bg-muted rounded"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-12 bg-muted rounded"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-12 bg-muted rounded"></div>
              </div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!currentUser) {
    return (
      <PageContainer>
        <div className="max-w-lg mx-auto p-8 bg-surface rounded-lg shadow-lg text-center">
          <p className="text-content">Please log in to continue.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="max-w-lg mx-auto p-8 bg-surface rounded-lg shadow-lg space-y-6 text-content transition-colors duration-300">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Complete Your Profile</h2>
          <p className="text-tertiary text-sm">Tell us a bit about yourself to get started</p>
        </div>
        {error && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-content mb-2">Profile Picture</label>
            <ProfileImageUpload
              userId={currentUser.id}
              currentAvatarUrl={formData.avatarUrl}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-content">Bio</span>
            <textarea
              name="bio"
              value={formData.bio ?? ''}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="Tell us about yourself..."
              className="mt-1 w-full p-3 bg-background border border-border rounded-lg text-content
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       hover:border-primary/50 transition-all duration-200
                       disabled:opacity-60 disabled:cursor-not-allowed resize-none"
              rows={4}
              aria-label="Bio"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg
                     hover:bg-primary-hover active:scale-[0.98] cursor-pointer
                     transition-all duration-200 shadow-md hover:shadow-lg
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary
                     flex items-center justify-center gap-2"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Saving...</span>
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </form>
      </div>
    </PageContainer>
  );
}
