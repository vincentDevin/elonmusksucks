import React, { useState } from 'react';
import type { TabType } from './AdminAchievementDashboard';

interface AdminAchievementBulkOperationsProps {
  selectedAchievements: Set<number>;
  currentTab: TabType;
  onBulkOperation: (operation: string) => Promise<void>;
  onClearSelection: () => void;
  className?: string;
}

const AdminAchievementBulkOperations: React.FC<AdminAchievementBulkOperationsProps> = ({
  selectedAchievements,
  currentTab,
  onBulkOperation,
  onClearSelection,
  className = '',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<string>('');

  const getAvailableOperations = (): Array<{
    value: string;
    label: string;
    icon: string;
    color: string;
  }> => {
    const operations: Array<{ value: string; label: string; icon: string; color: string }> = [];

    // Tab-specific operations
    if (currentTab === 'active') {
      operations.push({
        value: 'deactivate',
        label: 'Deactivate All',
        icon: '⏸️',
        color: 'text-warning hover:bg-warning',
      });
    }

    if (currentTab === 'inactive') {
      operations.push({
        value: 'activate',
        label: 'Activate All',
        icon: '▶️',
        color: 'text-success hover:bg-success',
      });
    }

    // Common operations available for all tabs
    operations.push(
      {
        value: 'export',
        label: 'Export Data',
        icon: '📄',
        color: 'text-info hover:bg-info',
      },
      {
        value: 'bulk-grant',
        label: 'Bulk Grant to Users',
        icon: '👥',
        color: 'text-primary hover:bg-primary',
      },
      {
        value: 'duplicate',
        label: 'Duplicate All',
        icon: '📋',
        color: 'text-secondary hover:bg-secondary',
      },
      {
        value: 'delete',
        label: 'Delete All',
        icon: '🗑️',
        color: 'text-error hover:bg-error',
      },
    );

    return operations;
  };

  const handleBulkOperation = async () => {
    if (!selectedOperation || selectedAchievements.size === 0) return;

    setIsProcessing(true);
    try {
      await onBulkOperation(selectedOperation);
      setSelectedOperation('');
    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const operations = getAvailableOperations();

  if (selectedAchievements.size === 0) {
    return null;
  }

  return (
    <div className={`bg-surface rounded-lg border border-primary/30 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{selectedAchievements.size}</span>
            </div>
            <span className="text-content font-medium">
              {selectedAchievements.size} achievement{selectedAchievements.size !== 1 ? 's' : ''}{' '}
              selected
            </span>
          </div>
        </div>

        <button
          onClick={onClearSelection}
          className="text-sm text-tertiary hover:text-content transition-colors"
        >
          Clear selection
        </button>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-content mb-2">Bulk Action</label>
          <select
            value={selectedOperation}
            onChange={(e) => setSelectedOperation(e.target.value)}
            disabled={isProcessing}
            className="w-full px-3 py-2 bg-surface border border-muted rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            <option value="">Select an action...</option>
            {operations.map((op) => (
              <option key={op.value} value={op.value}>
                {op.icon} {op.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleBulkOperation}
            disabled={!selectedOperation || isProcessing}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                Apply to {selectedAchievements.size} achievement
                {selectedAchievements.size !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Layout - Action Buttons */}
      <div className="md:hidden space-y-3">
        <div className="text-sm font-medium text-content mb-3">Choose an action:</div>
        <div className="grid grid-cols-1 gap-2">
          {operations.map((op) => (
            <button
              key={op.value}
              onClick={() => {
                setSelectedOperation(op.value);
                handleBulkOperation();
              }}
              disabled={isProcessing}
              className={`
                flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors font-medium disabled:opacity-50
                ${
                  selectedOperation === op.value
                    ? `${op.color} bg-opacity-10 border-current`
                    : 'border-muted text-content hover:border-primary'
                }
              `}
            >
              {isProcessing && selectedOperation === op.value ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <span>{op.icon}</span>
                  <span>{op.label}</span>
                  <span className="text-sm text-tertiary">({selectedAchievements.size})</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Warning for Destructive Actions */}
      {selectedOperation === 'delete' && (
        <div className="mt-4 p-3 bg-error/10 border border-error/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-error text-lg">⚠️</span>
            <div className="text-sm">
              <div className="font-medium text-error mb-1">Permanent Deletion</div>
              <div className="text-content">
                This action will permanently delete the selected achievements. This cannot be
                undone. All associated user progress will also be removed.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info for Bulk Grant */}
      {selectedOperation === 'bulk-grant' && (
        <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-primary text-lg">ℹ️</span>
            <div className="text-sm">
              <div className="font-medium text-primary mb-1">Bulk Grant to Users</div>
              <div className="text-content">
                This will open a dialog to select users and grant these achievements to them.
                Consider the impact on user experience and achievement value.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message for Export */}
      {selectedOperation === 'export' && (
        <div className="mt-4 p-3 bg-info/10 border border-info/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-info text-lg">📄</span>
            <div className="text-sm">
              <div className="font-medium text-info mb-1">Export Achievement Data</div>
              <div className="text-content">
                This will generate a CSV file containing all selected achievement data including
                stats, configurations, and user unlock information.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning for Deactivation */}
      {selectedOperation === 'deactivate' && (
        <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-warning text-lg">⚠️</span>
            <div className="text-sm">
              <div className="font-medium text-warning mb-1">Deactivate Achievements</div>
              <div className="text-content">
                Deactivated achievements will no longer be available for users to unlock. Existing
                unlocked achievements will remain on user profiles.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAchievementBulkOperations;
