import React, { useState } from 'react';
import type { UnifiedContentItem, UnifiedContentType } from '@ems/types';

interface ContentTableProps {
  content: UnifiedContentItem[];
  selectedContent: Set<string>;
  loading: boolean;
  error: string | null;
  onContentSelect: (contentId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
  className?: string;
}

/**
 * Unified Content Table Component
 *
 * Displays all content types (articles, user posts, comments, predictions) in a unified table
 * with support for bulk selection, responsive design, and detailed content preview.
 */
const ContentTable: React.FC<ContentTableProps> = ({
  content,
  selectedContent,
  loading,
  error,
  onContentSelect,
  onSelectAll,
  onPageChange,
  currentPage,
  totalPages,
  className = '',
}) => {
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Helper functions
  const getContentTypeIcon = (type: UnifiedContentType): string => {
    const icons: Record<UnifiedContentType, string> = {
      article: '📰',
      user_post: '💬',
      comment: '🗨️',
      prediction: '🔮',
    };
    return icons[type] || '📄';
  };

  const getContentTypeColor = (type: UnifiedContentType): string => {
    const colors: Record<UnifiedContentType, string> = {
      article: 'info',
      user_post: 'success',
      comment: 'secondary',
      prediction: 'primary',
    };
    return colors[type] || 'tertiary';
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      approved: 'success',
      pending: 'warning',
      rejected: 'error',
      flagged: 'error',
      draft: 'tertiary',
    };
    return colors[status as keyof typeof colors] || 'tertiary';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className={`bg-background rounded-lg border border-muted p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-48 mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-background rounded-lg border border-muted p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-error font-semibold">Error Loading Content</div>
          <div className="text-tertiary mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className={`bg-background rounded-lg border border-muted p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-content font-semibold">No Content Found</div>
          <div className="text-tertiary mt-1">Try adjusting your filters or search terms</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-background rounded-lg border border-muted ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-muted">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-content">Content Items</h3>
            <div className="text-xs text-tertiary">
              {content.length} items • Page {currentPage} of {totalPages}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-surface rounded-lg border border-muted">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 text-xs rounded-l-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary text-white'
                    : 'text-tertiary hover:text-content'
                }`}
              >
                📋 Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2 py-1 text-xs rounded-r-lg transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-primary text-white'
                    : 'text-tertiary hover:text-content'
                }`}
              >
                🗃️ Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        /* Desktop Table View */
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-muted">
                <th className="text-left py-3 px-4 text-sm font-medium text-tertiary w-12">
                  <input
                    type="checkbox"
                    checked={selectedContent.size === content.length && content.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 text-primary bg-background border border-muted rounded focus:ring-1 focus:ring-primary"
                  />
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-tertiary">Content</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-tertiary w-24">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-tertiary w-32">
                  Author
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-tertiary w-24">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-tertiary w-28">
                  Engagement
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-tertiary w-28">Date</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-tertiary w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {content.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className="border-b border-muted/50 hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedContent.has(item.id)}
                        onChange={(e) => onContentSelect(item.id, e.target.checked)}
                        className="w-4 h-4 text-primary bg-background border border-muted rounded focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    <td className="py-3 px-4 max-w-md">
                      <div>
                        <div className="font-medium text-content truncate">
                          {item.title || truncateText(item.content, 50)}
                        </div>
                        <div className="text-sm text-tertiary truncate mt-1">
                          {item.excerpt || truncateText(item.content, 80)}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getContentTypeIcon(item.type)}</span>
                        <span
                          className={`text-sm font-medium capitalize text-${getContentTypeColor(item.type)}`}
                        >
                          {item.type.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {item.author.avatarUrl && (
                          <img
                            src={item.author.avatarUrl}
                            alt={item.author.name}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-content">{item.author.name}</div>
                          <div className="text-xs text-tertiary capitalize">{item.author.type}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium bg-${getStatusColor(item.status)}/10 text-${getStatusColor(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-sm text-tertiary">
                        <div className="flex items-center gap-3">
                          <span>👀 {item.engagement?.views || 0}</span>
                          <span>❤️ {item.engagement?.reactions?.total || 0}</span>
                          <span>💬 {item.engagement?.comments || 0}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-sm text-tertiary">
                        {formatDate(item.timestamps.createdAt)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() =>
                            setExpandedContent(expandedContent === item.id ? null : item.id)
                          }
                          className="p-2 text-tertiary hover:text-content hover:bg-background rounded-lg transition-colors"
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          className="p-2 text-tertiary hover:text-content hover:bg-background rounded-lg transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="p-2 text-tertiary hover:text-content hover:bg-background rounded-lg transition-colors"
                          title="More Actions"
                        >
                          ⋯
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Content Row */}
                  {expandedContent === item.id && (
                    <tr className="border-b border-muted bg-surface/30">
                      <td colSpan={8} className="py-3 px-4">
                        <div className="bg-background rounded-lg border border-muted p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-content mb-2">Content Preview</h4>
                              <div className="text-sm text-tertiary">
                                {item.content.length > 300
                                  ? item.content.substring(0, 300) + '...'
                                  : item.content}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-content mb-2">Metadata</h4>
                              <div className="space-y-1 text-sm">
                                <div>
                                  <span className="text-tertiary">Priority:</span>{' '}
                                  <span className="text-content">{item.priority}</span>
                                </div>
                                <div>
                                  <span className="text-tertiary">Quality Score:</span>{' '}
                                  <span className="text-content">
                                    {item.quality?.score || 'N/A'}
                                  </span>
                                </div>
                                {item.metadata.tags && item.metadata.tags.length > 0 && (
                                  <div>
                                    <span className="text-tertiary">Tags:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {item.metadata.tags.map((tag, tagIndex) => (
                                        <span
                                          key={tagIndex}
                                          className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cards View */
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.map((item) => (
            <div
              key={item.id}
              className="bg-surface rounded-lg border border-muted p-4 hover:bg-background transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedContent.has(item.id)}
                    onChange={(e) => onContentSelect(item.id, e.target.checked)}
                    className="w-4 h-4 text-primary bg-background border border-muted rounded focus:ring-1 focus:ring-primary mt-1"
                  />
                  <div className="text-2xl">{getContentTypeIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-content truncate">
                      {item.title || 'Untitled'}
                    </div>
                    <div className="text-sm text-tertiary">{item.author.name}</div>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium bg-${getStatusColor(item.status)}/10 text-${getStatusColor(item.status)}`}
                >
                  {item.status}
                </span>
              </div>

              <div className="text-sm text-tertiary mb-3 line-clamp-3">
                {item.excerpt || item.content}
              </div>

              <div className="flex items-center justify-between text-xs text-tertiary">
                <div className="flex items-center gap-3">
                  <span>👀 {item.engagement?.views || 0}</span>
                  <span>❤️ {item.engagement?.reactions?.total || 0}</span>
                  <span>💬 {item.engagement?.comments || 0}</span>
                </div>
                <span>{formatDate(item.timestamps.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile List View */}
      <div className="lg:hidden p-4 space-y-4">
        {content.map((item) => (
          <div key={item.id} className="bg-surface rounded-lg border border-muted p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedContent.has(item.id)}
                  onChange={(e) => onContentSelect(item.id, e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border border-muted rounded focus:ring-1 focus:ring-primary mt-1"
                />
                <div className="text-2xl">{getContentTypeIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-content">{item.title || 'Untitled'}</div>
                  <div className="text-sm text-tertiary">
                    {item.author.name} • {formatDate(item.timestamps.createdAt)}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium bg-${getStatusColor(item.status)}/10 text-${getStatusColor(item.status)}`}
              >
                {item.status}
              </span>
            </div>

            <div className="text-sm text-tertiary mb-3">{truncateText(item.content, 120)}</div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-tertiary">
                <span>👀 {item.engagement?.views || 0}</span>
                <span>❤️ {item.engagement?.reactions?.total || 0}</span>
                <span>💬 {item.engagement?.comments || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-tertiary hover:text-content rounded">👁️</button>
                <button className="p-2 text-tertiary hover:text-content rounded">✏️</button>
                <button className="p-2 text-tertiary hover:text-content rounded">⋯</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-muted">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-tertiary">
              Showing {(currentPage - 1) * 25 + 1} to {Math.min(currentPage * 25, content.length)}{' '}
              of total results
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage <= 1}
                className="px-3 py-2 text-sm bg-surface border border-muted rounded disabled:opacity-50 hover:bg-background transition-colors"
              >
                First
              </button>
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-2 text-sm bg-surface border border-muted rounded disabled:opacity-50 hover:bg-background transition-colors"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  const pageNum = Math.max(1, currentPage - 2) + index;
                  if (pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`px-3 py-2 text-sm rounded transition-colors ${
                        pageNum === currentPage
                          ? 'bg-primary text-white'
                          : 'bg-surface border border-muted hover:bg-background'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 text-sm bg-surface border border-muted rounded disabled:opacity-50 hover:bg-background transition-colors"
              >
                Next
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 text-sm bg-surface border border-muted rounded disabled:opacity-50 hover:bg-background transition-colors"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentTable;
