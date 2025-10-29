import React, { useState } from 'react';
import type { BanType } from '@ems/types';

interface BanUserModalProps {
  userId: number;
  userName?: string;
  onSubmit: (data: {
    userId: number;
    banType: BanType;
    reason: string;
    duration?: number;
  }) => Promise<void>;
  onClose: () => void;
}

const BanUserModal: React.FC<BanUserModalProps> = ({ userId, userName, onSubmit, onClose }) => {
  const [banType, setBanType] = useState<BanType>('temporary');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<number>(1440); // 24 hours default
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      alert('Please provide a ban reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        userId,
        banType,
        reason: reason.trim(),
        duration: banType === 'temporary' ? duration : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Failed to ban user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-content mb-4">
            Ban User {userName && `- ${userName}`}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">Ban Type</label>
              <select
                value={banType}
                onChange={(e) => setBanType(e.target.value as BanType)}
                className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="temporary">Temporary Ban</option>
                <option value="permanent">Permanent Ban</option>
                <option value="shadow">Shadow Ban</option>
              </select>
              <p className="mt-1 text-xs text-tertiary">
                {banType === 'temporary' && 'User will be banned for a specified duration'}
                {banType === 'permanent' && 'User will be permanently banned'}
                {banType === 'shadow' && 'User can interact but content is hidden from others'}
              </p>
            </div>

            {banType === 'temporary' && (
              <div>
                <label className="block text-sm font-medium text-content mb-2">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value={60}>1 Hour</option>
                  <option value={360}>6 Hours</option>
                  <option value={720}>12 Hours</option>
                  <option value={1440}>24 Hours</option>
                  <option value={4320}>3 Days</option>
                  <option value={10080}>7 Days</option>
                  <option value={20160}>14 Days</option>
                  <option value={43200}>30 Days</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-content mb-2">
                Reason (Required)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:ring-2 focus:ring-primary focus:border-primary"
                rows={4}
                placeholder="Enter detailed reason for ban..."
                required
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Banning...' : 'Issue Ban'}
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

export default BanUserModal;
