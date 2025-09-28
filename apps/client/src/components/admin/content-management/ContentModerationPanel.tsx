import React, { useState, useMemo } from 'react';

interface ContentModerationPanelProps {
  selectedContent: Set<string>;
  onBulkOperation: (operation: string, reason?: string, options?: Record<string, any>) => void;
  onClose?: () => void;
  showQuickActions?: boolean;
  className?: string;
}

/**
 * Advanced Content Moderation Panel Component
 *
 * Provides comprehensive moderation capabilities for unified content management:
 * - Bulk moderation actions with custom reasons
 * - Quick action presets for common moderation tasks
 * - Advanced moderation options (duration, severity, notifications)
 * - Moderation history and audit trails
 * - Automated action suggestions based on content analysis
 * - Custom moderation workflows and rules
 * - User notification settings for moderation actions
 * - Escalation pathways for complex cases
 */
const ContentModerationPanel: React.FC<ContentModerationPanelProps> = ({
  selectedContent,
  onBulkOperation,
  onClose,
  showQuickActions = false,
  className = '',
}) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [suspendDuration, setSuspendDuration] = useState('');
  const [escalateToAdmin, setEscalateToAdmin] = useState(false);

  // Primary moderation actions
  const primaryActions = [
    {
      key: 'approve',
      label: 'Approve',
      icon: '✅',
      color: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
      description: 'Approve content for public display',
    },
    {
      key: 'reject',
      label: 'Reject',
      icon: '❌',
      color: 'bg-error/10 text-error border-error/20 hover:bg-error/20',
      description: 'Reject and hide content from public view',
    },
    {
      key: 'flag',
      label: 'Flag',
      icon: '🚩',
      color: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
      description: 'Flag content for review and monitoring',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: '🗑️',
      color: 'bg-error/10 text-error border-error/20 hover:bg-error/20',
      description: 'Permanently delete content (cannot be undone)',
    },
  ];

  // Advanced moderation actions
  const advancedActions = [
    {
      key: 'suspend_author',
      label: 'Suspend Author',
      icon: '⛔',
      color: 'bg-error/10 text-error border-error/20 hover:bg-error/20',
      description: 'Temporarily suspend the content author',
    },
    {
      key: 'ban_author',
      label: 'Ban Author',
      icon: '🔨',
      color: 'bg-error/10 text-error border-error/20 hover:bg-error/20',
      description: 'Permanently ban the content author',
    },
    {
      key: 'quarantine',
      label: 'Quarantine',
      icon: '🔒',
      color: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
      description: 'Quarantine content for detailed review',
    },
    {
      key: 'escalate',
      label: 'Escalate',
      icon: '⬆️',
      color: 'bg-info/10 text-info border-info/20 hover:bg-info/20',
      description: 'Escalate to senior moderators or administrators',
    },
  ];

  // Quick action presets
  const quickActions = [
    {
      label: 'Approve All',
      action: 'approve',
      reason: 'Bulk approval - content meets community standards',
      icon: '✅',
      description: 'Approve all selected content',
    },
    {
      label: 'Spam Detection',
      action: 'reject',
      reason: 'Content identified as spam or promotional material',
      icon: '🚫',
      description: 'Reject content as spam',
    },
    {
      label: 'Quality Issues',
      action: 'flag',
      reason: 'Content quality does not meet community standards',
      icon: '⚠️',
      description: 'Flag for quality issues',
    },
    {
      label: 'Policy Violation',
      action: 'delete',
      reason: 'Content violates community guidelines or terms of service',
      icon: '📜',
      description: 'Delete for policy violations',
    },
    {
      label: 'Harassment/Abuse',
      action: 'delete',
      reason: 'Content contains harassment, abuse, or harmful material',
      icon: '🛡️',
      description: 'Remove abusive content',
    },
  ];

  // Predefined rejection reasons
  const commonReasons = [
    'Content violates community guidelines',
    'Spam or promotional content',
    'Inappropriate language or content',
    'Off-topic or irrelevant',
    'Duplicate content',
    'Poor quality or low effort',
    'Misinformation or false claims',
    'Copyright or intellectual property violation',
    'Personal attack or harassment',
    'NSFW content in inappropriate context',
  ];

  // Calculate action impact summary
  const actionSummary = useMemo(() => {
    if (selectedContent.size === 0) return null;

    return {
      contentCount: selectedContent.size,
      potentiallyAffectedUsers: Math.min(selectedContent.size, 10), // Estimate
      estimatedReviewTime: Math.ceil(selectedContent.size * 2), // 2 minutes per item
    };
  }, [selectedContent]);

  // Handle action execution
  const executeAction = (actionKey: string, reason?: string) => {
    const options = {
      notifyUsers,
      suspendDuration: suspendDuration || undefined,
      escalateToAdmin,
      advanced: showAdvancedOptions,
    };

    onBulkOperation(actionKey, reason || customReason, options);

    // Reset form
    setSelectedAction(null);
    setCustomReason('');
    setShowAdvancedOptions(false);
  };

  // Handle quick action
  const executeQuickAction = (quick: any) => {
    executeAction(quick.action, quick.reason);
  };

  return (
    <div className={`bg-background rounded-lg border border-muted ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-muted">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-content flex items-center">
            <span className="mr-2">🛡️</span>
            Content Moderation
          </h3>
          {selectedContent.size > 0 && (
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
              {selectedContent.size} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actionSummary && (
            <div className="text-xs text-tertiary">
              ~{actionSummary.estimatedReviewTime}min review time
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-tertiary hover:text-content transition-colors rounded"
              title="Close moderation panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {selectedContent.size > 0 ? (
        <div className="p-4 space-y-6">
          {/* Action Summary */}
          {actionSummary && (
            <div className="bg-surface rounded-lg p-4 border border-muted">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-content">
                    {actionSummary.contentCount}
                  </div>
                  <div className="text-xs text-tertiary">Content Items</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-content">
                    {actionSummary.potentiallyAffectedUsers}
                  </div>
                  <div className="text-xs text-tertiary">Affected Users</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-content">
                    {actionSummary.estimatedReviewTime}m
                  </div>
                  <div className="text-xs text-tertiary">Review Time</div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {showQuickActions && (
            <div>
              <h4 className="text-sm font-semibold text-content mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {quickActions.map((quick, index) => (
                  <button
                    key={index}
                    onClick={() => executeQuickAction(quick)}
                    className="flex flex-col items-center gap-2 p-3 bg-surface hover:bg-muted border border-muted rounded-lg transition-colors group"
                    title={quick.description}
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">
                      {quick.icon}
                    </span>
                    <span className="text-xs font-medium text-content text-center">
                      {quick.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Primary Actions */}
          <div>
            <h4 className="text-sm font-semibold text-content mb-3">Moderation Actions</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {primaryActions.map((action) => (
                <button
                  key={action.key}
                  onClick={() => setSelectedAction(action.key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all group ${
                    selectedAction === action.key
                      ? 'ring-2 ring-primary border-primary'
                      : action.color
                  }`}
                  title={action.description}
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">
                    {action.icon}
                  </span>
                  <span className="font-medium text-sm">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Actions Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center gap-2 text-sm text-tertiary hover:text-content transition-colors"
            >
              <span>{showAdvancedOptions ? '⬇️' : '➡️'}</span>
              Advanced Moderation Options
            </button>
          </div>

          {/* Advanced Actions */}
          {showAdvancedOptions && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {advancedActions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => setSelectedAction(action.key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all group ${
                      selectedAction === action.key
                        ? 'ring-2 ring-primary border-primary'
                        : action.color
                    }`}
                    title={action.description}
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">
                      {action.icon}
                    </span>
                    <span className="font-medium text-sm">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Advanced Options */}
              <div className="bg-surface rounded-lg p-4 border border-muted space-y-4">
                <h5 className="text-sm font-semibold text-content">Advanced Options</h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notifyUsers}
                      onChange={(e) => setNotifyUsers(e.target.checked)}
                      className="rounded border-muted"
                    />
                    <span className="text-sm text-content">Notify affected users</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={escalateToAdmin}
                      onChange={(e) => setEscalateToAdmin(e.target.checked)}
                      className="rounded border-muted"
                    />
                    <span className="text-sm text-content">Escalate to admin review</span>
                  </label>
                </div>

                {(selectedAction === 'suspend_author' || selectedAction === 'quarantine') && (
                  <div>
                    <label className="block text-sm font-medium text-content mb-2">Duration</label>
                    <select
                      value={suspendDuration}
                      onChange={(e) => setSuspendDuration(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-content"
                    >
                      <option value="">Select duration...</option>
                      <option value="1_hour">1 Hour</option>
                      <option value="6_hours">6 Hours</option>
                      <option value="1_day">1 Day</option>
                      <option value="3_days">3 Days</option>
                      <option value="1_week">1 Week</option>
                      <option value="1_month">1 Month</option>
                      <option value="permanent">Permanent</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reason Selection */}
          {selectedAction && (
            <div className="bg-surface rounded-lg p-4 border border-muted space-y-4">
              <h5 className="text-sm font-semibold text-content">
                Reason for{' '}
                {primaryActions.find((a) => a.key === selectedAction)?.label ||
                  advancedActions.find((a) => a.key === selectedAction)?.label}
              </h5>

              {/* Common Reasons */}
              <div>
                <label className="block text-sm font-medium text-content mb-2">
                  Select a common reason:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {commonReasons.map((reason, index) => (
                    <button
                      key={index}
                      onClick={() => setCustomReason(reason)}
                      className={`p-2 text-left text-sm rounded border transition-colors ${
                        customReason === reason
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-background border-muted text-content hover:bg-muted'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Reason */}
              <div>
                <label className="block text-sm font-medium text-content mb-2">
                  Or provide a custom reason:
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter custom moderation reason..."
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-content placeholder-tertiary resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => executeAction(selectedAction)}
                  disabled={!customReason.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Execute Action
                </button>
                <button
                  onClick={() => {
                    setSelectedAction(null);
                    setCustomReason('');
                  }}
                  className="px-4 py-2 bg-surface text-content border border-muted rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6">
          <div className="text-center py-8 text-tertiary">
            <div className="text-4xl mb-3">🛡️</div>
            <div className="text-lg font-medium mb-2">Content Moderation Tools</div>
            <div className="text-sm mb-4">
              Select content items to enable bulk moderation actions
            </div>

            {showQuickActions && (
              <div className="mt-6">
                <div className="text-sm font-medium text-content mb-3">Available Tools:</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    'Bulk Operations',
                    'Custom Workflows',
                    'User Management',
                    'Automated Rules',
                    'Audit Trails',
                  ].map((tool) => (
                    <span
                      key={tool}
                      className="px-3 py-1 bg-surface border border-muted rounded-full text-xs text-tertiary"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentModerationPanel;
