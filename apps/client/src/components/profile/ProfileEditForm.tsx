import React, { useState } from 'react';
import type { UpdateProfilePayload } from '../../api/users';
import { ProfileImageUpload } from './ProfileImageUpload';

export function ProfileEditForm({
  userId,
  formData,
  setFormData,
  handleSave,
  saving,
}: {
  userId: number;
  formData: UpdateProfilePayload;
  setFormData: React.Dispatch<React.SetStateAction<UpdateProfilePayload>>;
  handleSave: (e: React.FormEvent) => void;
  saving: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  // -- Image upload handlers --
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

  // -- General field change handler --
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, type, value, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="bg-surface p-6 rounded-lg shadow space-y-4">
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Profile Picture</label>
          <ProfileImageUpload
            userId={userId}
            currentAvatarUrl={formData.avatarUrl}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
            disabled={saving}
          />
        </div>

        <label className="block">
          <span className="text-sm font-medium">Bio</span>
          <textarea
            name="bio"
            value={formData.bio ?? ''}
            onChange={handleChange}
            className="mt-1 w-full p-2 border rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Location</span>
          <input
            name="location"
            value={formData.location ?? ''}
            onChange={handleChange}
            className="mt-1 w-full p-2 border rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Timezone</span>
          <input
            name="timezone"
            value={formData.timezone ?? ''}
            onChange={handleChange}
            className="mt-1 w-full p-2 border rounded"
          />
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="notifyOnResolve"
            checked={formData.notifyOnResolve}
            onChange={handleChange}
            className="form-checkbox"
          />
          <span className="text-sm">Notify on resolve</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Theme</span>
          <select
            name="theme"
            value={formData.theme}
            onChange={handleChange}
            className="mt-1 w-full p-2 border rounded"
          >
            <option value="LIGHT">Light</option>
            <option value="DARK">Dark</option>
          </select>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="twoFactorEnabled"
            checked={formData.twoFactorEnabled}
            onChange={handleChange}
            className="form-checkbox"
          />
          <span className="text-sm">Two-factor authentication</span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
