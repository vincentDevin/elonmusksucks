import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, updateUserProfile } from '../api/users';
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
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    getUserProfile(currentUser.id)
      .then((profile) => {
        setFormData({
          bio: profile.bio || '',
          avatarUrl: profile.avatarUrl || '',
          location: profile.location || '',
          timezone: profile.timezone || '',
          notifyOnResolve: profile.notifyOnResolve,
          theme: profile.theme,
          twoFactorEnabled: profile.twoFactorEnabled,
          profileComplete: false,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentUser]);

  // If user already completed profile, redirect to home
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
    <div className="max-w-lg mx-auto p-6 bg-surface rounded-lg shadow space-y-4">
      <h2 className="text-2xl font-bold">Complete Your Profile</h2>
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Bio</span>
          <textarea
            name="bio"
            value={formData.bio ?? ''}
            onChange={handleChange}
            className="mt-1 w-full p-2 border rounded"
          ></textarea>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Avatar URL</span>
          <input
            name="avatarUrl"
            value={formData.avatarUrl ?? ''}
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
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Profile
        </button>
      </form>
    </div>
  );
}
