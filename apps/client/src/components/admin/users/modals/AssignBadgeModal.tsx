import React, { useState } from 'react';
import BadgeSelector from '../shared/BadgeSelector';
import type { PublicBadge } from '@ems/types';

interface AssignBadgeModalProps {
  userId: number;
  userName?: string;
  currentBadges: PublicBadge[];
  onSubmit: (badgeId: number) => Promise<void>;
  onClose: () => void;
}

const AssignBadgeModal: React.FC<AssignBadgeModalProps> = ({
  userId,
  userName,
  currentBadges,
  onSubmit,
  onClose,
}) => {
  const [selectedBadgeId, setSelectedBadgeId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBadgeId) {
      alert('Please select a badge to assign');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(selectedBadgeId);
      onClose();
    } catch (error) {
      console.error('Failed to assign badge:', error);
      alert('Failed to assign badge. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-content mb-4">
            Assign Badge {userName && `- ${userName}`}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {currentBadges.length > 0 && (
              <div className="bg-background rounded-lg p-4 border border-muted">
                <h3 className="text-sm font-medium text-content mb-2">Current Badges:</h3>
                <div className="flex flex-wrap gap-2">
                  {currentBadges.map((badge) => (
                    <span
                      key={badge.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300"
                    >
                      {badge.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-content mb-2">
                Select Badge to Assign
              </label>
              <BadgeSelector
                value={selectedBadgeId}
                onChange={setSelectedBadgeId}
                currentBadges={currentBadges}
              />
              <p className="mt-1 text-xs text-tertiary">
                Only badges not currently assigned to this user are shown
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={isSubmitting || !selectedBadgeId}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Assigning...' : 'Assign Badge'}
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

export default AssignBadgeModal;
