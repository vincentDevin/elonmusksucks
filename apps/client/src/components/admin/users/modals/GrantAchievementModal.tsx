import React, { useState, useEffect } from 'react';
import { getAllAchievements } from '../../../../api/admin';
import type { AchievementWithStats } from '../../../../api/admin';

interface GrantAchievementModalProps {
  userId: number;
  userName?: string;
  onSubmit: (achievementId: number) => Promise<void>;
  onClose: () => void;
}

const GrantAchievementModal: React.FC<GrantAchievementModalProps> = ({
  userId,
  userName,
  onSubmit,
  onClose,
}) => {
  const [achievements, setAchievements] = useState<AchievementWithStats[]>([]);
  const [selectedAchievementId, setSelectedAchievementId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadAchievements = async () => {
      try {
        const data = await getAllAchievements();
        setAchievements(data.filter((a) => a.isActive));
      } catch (error) {
        console.error('Failed to load achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAchievementId) {
      alert('Please select an achievement to grant');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(selectedAchievementId);
      onClose();
    } catch (error) {
      console.error('Failed to grant achievement:', error);
      alert('Failed to grant achievement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAchievement = achievements.find((a) => a.id === selectedAchievementId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-content mb-4">
            Grant Achievement {userName && `- ${userName}`}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">
                Select Achievement
              </label>
              {loading ? (
                <div className="w-full px-3 py-2 border border-muted rounded-lg bg-background">
                  <span className="text-tertiary text-sm">Loading achievements...</span>
                </div>
              ) : (
                <select
                  value={selectedAchievementId || ''}
                  onChange={(e) => setSelectedAchievementId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select an achievement...</option>
                  {achievements.map((achievement) => (
                    <option key={achievement.id} value={achievement.id}>
                      {achievement.name} ({achievement.rarity})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedAchievement && (
              <div className="bg-background rounded-lg p-4 border border-muted">
                <h3 className="font-medium text-content mb-2">{selectedAchievement.name}</h3>
                <p className="text-sm text-tertiary mb-2">{selectedAchievement.description}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-tertiary">
                    Category:{' '}
                    <span className="text-content font-medium">{selectedAchievement.category}</span>
                  </span>
                  <span className="text-tertiary">
                    Rarity:{' '}
                    <span className="text-content font-medium">{selectedAchievement.rarity}</span>
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={isSubmitting || !selectedAchievementId || loading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Granting...' : 'Grant Achievement'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-muted text-content rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GrantAchievementModal;
