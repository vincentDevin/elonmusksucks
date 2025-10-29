import React from 'react';

interface ModerationLogEntry {
  id: number;
  action: string;
  reason?: string;
  createdAt: string;
  moderator?: {
    id: number;
    name: string;
  };
  metadata?: any;
}

interface ModerationHistorySectionProps {
  history: ModerationLogEntry[];
}

const ModerationHistorySection: React.FC<ModerationHistorySectionProps> = ({ history }) => {
  const getActionIcon = (action: string) => {
    if (action.includes('ban')) return '🚫';
    if (action.includes('unban')) return '✅';
    if (action.includes('mute')) return '🔇';
    if (action.includes('kick')) return '👢';
    if (action.includes('warn')) return '⚠️';
    return '📝';
  };

  const getActionColor = (action: string) => {
    if (action.includes('ban')) return 'bg-red-100 text-red-800 border-red-300';
    if (action.includes('unban')) return 'bg-green-100 text-green-800 border-green-300';
    if (action.includes('mute')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (action.includes('kick')) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (action.includes('warn')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-semibold text-content">Moderation History</h3>

      {history.length === 0 ? (
        <div className="text-center py-12 bg-background rounded-lg border border-muted">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-tertiary">No moderation history</p>
          <p className="text-sm text-tertiary mt-2">
            This user has not been subject to any moderation actions
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="bg-background rounded-lg p-4 border border-muted hover:border-primary transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl mt-1">{getActionIcon(entry.action)}</div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getActionColor(entry.action)}`}
                    >
                      {entry.action}
                    </span>
                    <span className="text-xs text-tertiary">{formatDate(entry.createdAt)}</span>
                  </div>

                  {entry.reason && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-content">Reason: </span>
                      <span className="text-sm text-tertiary">{entry.reason}</span>
                    </div>
                  )}

                  {entry.moderator && (
                    <div className="text-xs text-tertiary">
                      By: <span className="font-medium text-content">{entry.moderator.name}</span>
                    </div>
                  )}

                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-tertiary cursor-pointer hover:text-content">
                        Show details
                      </summary>
                      <pre className="text-xs bg-muted rounded p-2 mt-2 overflow-auto">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>

                <div className="text-xs text-tertiary text-right">
                  {new Date(entry.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModerationHistorySection;
