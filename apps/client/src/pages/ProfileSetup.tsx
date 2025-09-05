import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, updateUserProfile } from '../api/users';
import type { UpdateProfilePayload } from '../api/users';
import { ProfileImageUpload } from '../components/profile/ProfileImageUpload';

export default function ProfileSetup() {
  const { user: currentUser, refreshUser } = useAuth();
  const [formData, setFormData] = useState<UpdateProfilePayload>({
    bio: '',
    avatarUrl: '',
    location: '',
    timezone: '',
    notifyOnResolve: true,
    theme: 'LIGHT',
    twoFactorEnabled: false,
    profileComplete: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;
    getUserProfile(currentUser.id)
      .then((profile) => {
        setFormData({
          bio: profile.bio ?? '',
          avatarUrl: profile.avatarUrl ?? '',
          location: profile.location ?? '',
          timezone: profile.timezone ?? '',
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
      navigate('/');
    }
  }, [loading, formData.profileComplete, navigate]);

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
    try {
      if (!currentUser?.id) throw new Error('User not authenticated');
      await updateUserProfile(currentUser.id, { ...formData, profileComplete: true });
      await refreshUser();
      window.location.href = '/dashboard';
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to update profile';
      setError(errorMessage);
    }
  };

  // Rollback: git checkout HEAD -- apps/client/src/pages/ProfileSetup.tsx
  if (loading) return <p>Loading...</p>;
  if (!currentUser) return <p>Please log in to continue.</p>;

  return (
    <div className="max-w-lg mx-auto p-6 bg-surface rounded-lg shadow space-y-6">
      <h2 className="text-2xl font-bold">Complete Your Profile</h2>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Profile Picture</label>
          <ProfileImageUpload
            userId={currentUser.id}
            currentAvatarUrl={formData.avatarUrl}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </div>

        <label className="block">
          <span className="text-sm font-medium">Bio</span>
          <textarea
            name="bio"
            value={formData.bio ?? ''}
            onChange={handleChange}
            className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
            rows={4}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Location</span>
          <input
            name="location"
            value={formData.location ?? ''}
            onChange={handleChange}
            className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Timezone</span>
          <input
            name="timezone"
            value={formData.timezone ?? ''}
            onChange={handleChange}
            className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
          />
        </label>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Save Profile
        </button>
      </form>
    </div>
  );
}
