import React, { useState } from 'react';
import type { UpdateProfilePayload } from '../../api/users';
import { uploadProfileImage } from '../../api/users';

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadProfileImage(userId, file);
      setFormData((prev) => ({ ...prev, avatarUrl: url }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-surface p-6 rounded-lg shadow space-y-4">
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleSave} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Profile Picture</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading || saving}
            className="mt-1"
          />
          {uploading && <p className="text-sm text-gray-500">Uploading…</p>}
          {formData.avatarUrl && (
            <img
              src={formData.avatarUrl}
              alt="Avatar preview"
              className="mt-2 h-24 w-24 rounded-full object-cover"
            />
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium">Bio</span>
          <textarea
            name="bio"
            value={formData.bio ?? ''}
            onChange={(e) => setFormData((f) => ({ ...f, bio: e.target.value }))}
            className="mt-1 w-full p-2 border rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Location</span>
          <input
            name="location"
            value={formData.location ?? ''}
            onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
            className="mt-1 w-full p-2 border rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Timezone</span>
          <input
            name="timezone"
            value={formData.timezone ?? ''}
            onChange={(e) => setFormData((f) => ({ ...f, timezone: e.target.value }))}
            className="mt-1 w-full p-2 border rounded"
          />
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="notifyOnResolve"
            checked={formData.notifyOnResolve}
            onChange={(e) => setFormData((f) => ({ ...f, notifyOnResolve: e.target.checked }))}
            className="form-checkbox"
          />
          <span className="text-sm">Notify on resolve</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Theme</span>
          <select
            name="theme"
            value={formData.theme}
            onChange={(e) =>
              setFormData((f) => ({ ...f, theme: e.target.value as UpdateProfilePayload['theme'] }))
            }
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
            onChange={(e) => setFormData((f) => ({ ...f, twoFactorEnabled: e.target.checked }))}
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
