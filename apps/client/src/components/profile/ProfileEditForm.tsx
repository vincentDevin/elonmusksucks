import React, { useState } from 'react';
import type { UpdateProfilePayload } from '../../api/users';
import { uploadProfileImage } from '../../api/users';

const fallbackAvatar =
  'https://ui-avatars.com/api/?name=Unknown&background=64748b&color=fff&size=96';

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -- Image upload handler --
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadProfileImage(userId, file);
      setFormData((prev) => ({ ...prev, avatarUrl: url }));
    } catch (err: any) {
      setError(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
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
        <label className="block">
          <span className="text-sm font-medium">Profile Picture</span>
          <div className="mt-2 flex items-center">
            <div className="h-24 w-24 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-300">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={fallbackAvatar}
                  alt="No avatar"
                  className="h-full w-full object-cover opacity-50"
                />
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
                disabled={uploading || saving}
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
          disabled={saving || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
