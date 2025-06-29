import React from 'react';
import type { UpdateProfilePayload } from '../../api/users';

export function ProfileEditForm({
  formData,
  setFormData,
  handleSave,
  saving,
}: {
  formData: UpdateProfilePayload;
  setFormData: React.Dispatch<React.SetStateAction<UpdateProfilePayload>>;
  handleSave: (e: React.FormEvent) => void;
  saving: boolean;
}) {
  return (
    <div className="bg-surface p-6 rounded-lg shadow space-y-4">
      <form onSubmit={handleSave} className="space-y-4">
        {/* ...inputs as before... */}
        <label className="block">
          <span className="text-sm font-medium">Bio</span>
          <textarea
            value={formData.bio ?? ''}
            onChange={(e) => setFormData((f) => ({ ...f, bio: e.target.value }))}
            className="mt-1 w-full p-2 border rounded"
          />
        </label>
        {/* Add rest of the fields... */}
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
