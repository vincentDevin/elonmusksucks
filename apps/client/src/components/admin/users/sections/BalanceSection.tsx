import React, { useState } from 'react';
import AdjustBalanceModal from '../modals/AdjustBalanceModal';
import { updateUserBalance } from '../../../../api/admin';
import { formatMuskBucks } from '../../../../utils/formatting';

interface BalanceSectionProps {
  userId: number;
  userName?: string;
  currentBalance: number;
  onUpdate: () => void;
}

const BalanceSection: React.FC<BalanceSectionProps> = ({
  userId,
  userName,
  currentBalance,
  onUpdate,
}) => {
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const handleAdjust = async (amount: number, reason: string) => {
    await updateUserBalance(userId, amount);
    setShowAdjustModal(false);
    onUpdate();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-content">Balance Management</h3>
        <button
          onClick={() => setShowAdjustModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
        >
          Adjust Balance
        </button>
      </div>

      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="text-sm opacity-90 mb-2">Current Balance</div>
        <div className="text-4xl font-bold mb-4">${formatMuskBucks(currentBalance)}</div>
        <div className="flex items-center gap-2 text-sm opacity-90">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
              clipRule="evenodd"
            />
          </svg>
          <span>MuskBucks Balance</span>
        </div>
      </div>

      <div className="bg-background rounded-lg p-4 border border-muted">
        <h4 className="font-medium text-content mb-3">Balance Adjustment Guidelines</h4>
        <ul className="space-y-2 text-sm text-tertiary">
          <li className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>Use positive values to add credits (rewards, corrections)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-600">✓</span>
            <span>Use negative values to deduct credits (penalties, corrections)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">ℹ️</span>
            <span>Always provide a detailed reason for the adjustment</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">⚠️</span>
            <span>Balance adjustments are logged and auditable</span>
          </li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h4 className="font-medium text-yellow-900 mb-1">Important</h4>
            <p className="text-sm text-yellow-700">
              Balance adjustments directly affect the user's account. Ensure accuracy and provide
              clear documentation for all changes.
            </p>
          </div>
        </div>
      </div>

      {showAdjustModal && (
        <AdjustBalanceModal
          userId={userId}
          userName={userName}
          currentBalance={currentBalance}
          onSubmit={handleAdjust}
          onClose={() => setShowAdjustModal(false)}
        />
      )}
    </div>
  );
};

export default BalanceSection;
