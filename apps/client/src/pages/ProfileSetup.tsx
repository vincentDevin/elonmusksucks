import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, updateUserProfile, uploadProfileImage } from '../api/users';
import type { UpdateProfilePayload } from '../api/users';

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
  const [uploading, setUploading] = useState(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadProfileImage(currentUser.id, file);
      setFormData((prev) => ({ ...prev, avatarUrl: url }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await updateUserProfile(currentUser!.id, { ...formData, profileComplete: true });
      await refreshUser();
      navigate('/');
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-lg mx-auto p-6 bg-surface rounded-lg shadow space-y-6">
      <h2 className="text-2xl font-bold">Complete Your Profile</h2>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="text-sm font-medium">Profile Picture</span>
          <div className="mt-2 flex items-center">
            <div className="h-24 w-24 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400">
                  <span>No image</span>
                </div>
              )}
            </div>
            <div className="ml-4">
              <label
                htmlFor="avatar"
                className="inline-flex items-center px-3 py-2 bg-white text-gray-700 shadow-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
              >
                {uploading ? 'Uploading…' : 'Change'}
              </label>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {uploading && <p className="mt-1 text-sm text-gray-500">Uploading...</p>}
            </div>
          </div>
        </label>

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
          disabled={uploading}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Save Profile
        </button>
      </form>
    </div>
  );
}
