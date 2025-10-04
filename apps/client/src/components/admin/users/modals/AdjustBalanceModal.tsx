import React, { useState } from 'react';
import { formatMuskBucks } from '../../../../utils/formatting';

interface AdjustBalanceModalProps {
  userId: number;
  userName?: string;
  currentBalance: number;
  onSubmit: (amount: number, reason: string) => Promise<void>;
  onClose: () => void;
}

const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  userId,
  userName,
  currentBalance,
  onSubmit,
  onClose,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const newBalance = currentBalance + numericAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (numericAmount === 0) {
      alert('Please enter a non-zero amount');
      return;
    }

    if (!reason.trim()) {
      alert('Please provide a reason for the balance adjustment');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(numericAmount, reason.trim());
      onClose();
    } catch (error) {
      console.error('Failed to adjust balance:', error);
      alert('Failed to adjust balance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-content mb-4">
            Adjust Balance {userName && `- ${userName}`}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-background rounded-lg p-4 border border-muted">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-tertiary">Current Balance:</span>
                <span className="text-lg font-semibold text-content">
                  ${formatMuskBucks(currentBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-tertiary">New Balance:</span>
                <span
                  className={`text-lg font-semibold ${newBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  ${formatMuskBucks(newBalance)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-content mb-2">
                Adjustment Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Enter amount (use - for debit, + for credit)"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-tertiary">
                Use positive numbers to add, negative numbers to deduct
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-content mb-2">
                Reason (Required)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:ring-2 focus:ring-primary focus:border-primary"
                rows={3}
                placeholder="Enter reason for balance adjustment..."
                required
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Adjusting...' : 'Adjust Balance'}
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

export default AdjustBalanceModal;
