import React, { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { searchPredictions, bulkUpdatePredictions, getPredictionDetails } from '../../api/admin';
import type {
  PredictionSearchParams,
  DetailedPrediction,
  PaginatedPredictions,
  BulkPredictionOperation,
} from '../../api/admin';

interface ModernPredictionQueueProps {
  className?: string;
}

type TabType = 'pending' | 'approved' | 'resolved' | 'rejected';

interface PredictionRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    predictions: DetailedPrediction[];
    selectedPredictions: Set<number>;
    onPredictionSelect: (predictionId: number, selected: boolean) => void;
    onPredictionAction: (predictionId: number, action: string) => void;
    currentTab: TabType;
  };
}

const PredictionRow: React.FC<PredictionRowProps> = ({ index, style, data }) => {
  const { predictions, selectedPredictions, onPredictionSelect, onPredictionAction, currentTab } =
    data;
  const prediction = predictions[index];
  const isSelected = selectedPredictions.has(prediction.id);
  const isEven = index % 2 === 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-warning';
      case 'approved':
        return 'text-success';
      case 'resolved':
        return 'text-primary';
      case 'rejected':
        return 'text-error';
      default:
        return 'text-content';
    }
  };

  const getControversyLevel = (score: number) => {
    if (score > 70) return 'High';
    if (score > 40) return 'Medium';
    return 'Low';
  };

  const getPopularityLevel = (score: number) => {
    if (score > 70) return 'Hot';
    if (score > 40) return 'Popular';
    return 'Quiet';
  };

  const currentStatus = prediction.resolved
    ? 'resolved'
    : prediction.approved
      ? 'approved'
      : !prediction.approved && currentTab === 'rejected'
        ? 'rejected'
        : 'pending';

  return (
    <div
      style={style}
      className={`grid grid-cols-12 gap-3 px-4 py-3 border-b border-muted text-sm items-center ${
        isEven ? 'bg-surface' : 'bg-muted'
      } ${isSelected ? 'ring-2 ring-primary' : ''} hover:bg-accent hover:bg-opacity-10 transition-colors`}
    >
      {/* Checkbox */}
      <div className="col-span-1 flex justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onPredictionSelect(prediction.id, e.target.checked)}
          className="rounded border-muted"
        />
      </div>

      {/* Prediction Info */}
      <div className="col-span-3">
        <div className="font-medium text-content truncate mb-1">{prediction.title}</div>
        <div className="text-xs text-tertiary truncate">{prediction.description}</div>
        <div className="flex items-center space-x-2 mt-1">
          <span className="px-2 py-0.5 text-xs bg-secondary text-surface rounded">
            {prediction.category}
          </span>
          {prediction.qualityFlags?.needsReview && (
            <span className="px-2 py-0.5 text-xs bg-warning text-surface rounded">
              Needs Review
            </span>
          )}
        </div>
      </div>

      {/* Creator */}
      <div className="col-span-1">
        <div className="text-xs text-content">{prediction.creator?.name || 'Unknown'}</div>
        <div className="text-xs text-tertiary">{formatDate(prediction.createdAt.toString())}</div>
      </div>

      {/* Status */}
      <div className="col-span-1 text-center">
        <span className={`text-xs font-medium ${getStatusColor(currentStatus)}`}>
          {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
        </span>
      </div>

      {/* Analytics */}
      <div className="col-span-2 text-xs text-tertiary">
        <div>Bets: {prediction.analytics?.totalBets || 0}</div>
        <div>Volume: {prediction.analytics?.totalVolume?.toFixed(0) || 0}</div>
        <div>Bettors: {prediction.analytics?.uniqueBettors || 0}</div>
      </div>

      {/* Engagement Metrics */}
      <div className="col-span-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-tertiary">Controversy:</span>
          <span
            className={`font-medium ${
              (prediction.analytics?.controversyScore || 0) > 70
                ? 'text-error'
                : (prediction.analytics?.controversyScore || 0) > 40
                  ? 'text-warning'
                  : 'text-success'
            }`}
          >
            {getControversyLevel(prediction.analytics?.controversyScore || 0)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-tertiary">Interest:</span>
          <span
            className={`font-medium ${
              (prediction.analytics?.popularityScore || 0) > 70
                ? 'text-error'
                : (prediction.analytics?.popularityScore || 0) > 40
                  ? 'text-primary'
                  : 'text-tertiary'
            }`}
          >
            {getPopularityLevel(prediction.analytics?.popularityScore || 0)}
          </span>
        </div>
      </div>

      {/* Expires */}
      <div className="col-span-1 text-xs text-tertiary">
        {formatDate(prediction.expiresAt.toString())}
      </div>

      {/* Actions */}
      <div className="col-span-1 flex justify-center space-x-1">
        {currentTab === 'pending' && (
          <>
            <button
              onClick={() => onPredictionAction(prediction.id, 'approve')}
              className="p-1 text-success hover:bg-success hover:text-surface rounded transition"
              title="Approve"
            >
              ✓
            </button>
            <button
              onClick={() => onPredictionAction(prediction.id, 'reject')}
              className="p-1 text-error hover:bg-error hover:text-surface rounded transition"
              title="Reject"
            >
              ✗
            </button>
          </>
        )}
        {currentTab === 'approved' && (
          <button
            onClick={() => onPredictionAction(prediction.id, 'resolve')}
            className="p-1 text-primary hover:bg-primary hover:text-surface rounded transition"
            title="Resolve"
          >
            ⚡
          </button>
        )}
        <button
          onClick={() => onPredictionAction(prediction.id, 'details')}
          className="p-1 text-tertiary hover:text-content rounded hover:bg-muted transition"
          title="View Details"
        >
          👁
        </button>
      </div>
    </div>
  );
};

const ModernPredictionQueue: React.FC<ModernPredictionQueueProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [predictions, setPredictions] = useState<DetailedPrediction[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<Omit<PaginatedPredictions, 'predictions'>>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    analytics: {
      totalPending: 0,
      totalApproved: 0,
      totalResolved: 0,
      totalRejected: 0,
      avgResolutionTime: 0,
    },
  });
  const [loading, setLoading] = useState(false);
  const [selectedPredictions, setSelectedPredictions] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [bulkOperation, setBulkOperation] = useState<BulkPredictionOperation['operation'] | ''>('');

  const categories = ['Politics', 'Sports', 'Technology', 'Entertainment', 'Economics', 'Science'];

  const fetchPredictions = useCallback(
    async (page = 0) => {
      setLoading(true);
      try {
        const params: PredictionSearchParams = {
          search: searchText.trim() || undefined,
          category: selectedCategory ? [selectedCategory] : undefined,
          status: [activeTab],
          page,
          limit: 25,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        };

        const results = await searchPredictions(params);
        setPredictions(results.predictions);
        setPaginationInfo({
          totalCount: results.totalCount,
          totalPages: results.totalPages,
          currentPage: results.currentPage,
          hasNextPage: results.hasNextPage,
          hasPreviousPage: results.hasPreviousPage,
          analytics: results.analytics,
        });
      } catch (error) {
        console.error('Failed to fetch predictions:', error);
        setPredictions([]);
        setPaginationInfo({
          totalCount: 0,
          totalPages: 0,
          currentPage: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        });
      } finally {
        setLoading(false);
      }
    },
    [activeTab, searchText, selectedCategory],
  );

  useEffect(() => {
    fetchPredictions(0);
    setSelectedPredictions(new Set());
  }, [fetchPredictions]);

  const handlePredictionSelect = useCallback((predictionId: number, selected: boolean) => {
    setSelectedPredictions((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(predictionId);
      } else {
        newSet.delete(predictionId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = () => {
    if (selectedPredictions.size === predictions.length) {
      setSelectedPredictions(new Set());
    } else {
      setSelectedPredictions(new Set(predictions.map((p) => p.id)));
    }
  };

  const handlePredictionAction = async (predictionId: number, action: string) => {
    if (action === 'details') {
      // Open details modal/panel
      const details = await getPredictionDetails(predictionId);
      console.log('Prediction details:', details);
      return;
    }

    try {
      const operation: BulkPredictionOperation = {
        predictionIds: [predictionId],
        operation: action as any,
      };

      await bulkUpdatePredictions(operation);
      fetchPredictions(paginationInfo.currentPage);
    } catch (error) {
      console.error(`Failed to ${action} prediction:`, error);
    }
  };

  const handleBulkOperation = async () => {
    if (selectedPredictions.size === 0 || !bulkOperation) return;

    try {
      const operation: BulkPredictionOperation = {
        predictionIds: Array.from(selectedPredictions),
        operation: bulkOperation,
      };

      await bulkUpdatePredictions(operation);
      setSelectedPredictions(new Set());
      setBulkOperation('');
      fetchPredictions(paginationInfo.currentPage);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  };

  const rowData = {
    predictions,
    selectedPredictions,
    onPredictionSelect: handlePredictionSelect,
    onPredictionAction: handlePredictionAction,
    currentTab: activeTab,
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: paginationInfo.analytics?.totalPending || 0 },
    { key: 'approved', label: 'Approved', count: paginationInfo.analytics?.totalApproved || 0 },
    { key: 'resolved', label: 'Resolved', count: paginationInfo.analytics?.totalResolved || 0 },
    { key: 'rejected', label: 'Rejected', count: paginationInfo.analytics?.totalRejected || 0 },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Analytics */}
      <div className="bg-surface border border-muted rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-content">Prediction Management</h2>
            <p className="text-tertiary">
              Advanced prediction queue with analytics and bulk operations
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-tertiary">
              Avg Resolution Time: {paginationInfo.analytics?.avgResolutionTime || 0}h
            </div>
            {loading && <div className="text-sm text-primary mt-1">Loading...</div>}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`p-3 rounded-lg text-center cursor-pointer transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-surface'
                  : 'bg-muted hover:bg-accent hover:bg-opacity-20'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <div className="text-lg font-semibold">{tab.count.toLocaleString()}</div>
              <div className="text-xs">{tab.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-surface border border-muted rounded-lg p-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search predictions..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-4 py-2 border border-muted rounded-lg bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-muted rounded-lg bg-surface text-content"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Bulk Operations */}
        {selectedPredictions.size > 0 && (
          <div className="flex items-center space-x-4 p-3 bg-muted rounded-lg">
            <span className="text-sm text-content">{selectedPredictions.size} selected</span>

            <select
              value={bulkOperation}
              onChange={(e) => setBulkOperation(e.target.value as any)}
              className="px-3 py-2 border border-muted rounded bg-surface"
            >
              <option value="">Select action...</option>
              {activeTab === 'pending' && (
                <>
                  <option value="approve">Approve All</option>
                  <option value="reject">Reject All</option>
                </>
              )}
              {activeTab === 'approved' && <option value="resolve">Resolve All</option>}
              <option value="delete">Delete All</option>
            </select>

            <button
              onClick={handleBulkOperation}
              disabled={!bulkOperation}
              className="px-4 py-2 bg-primary text-surface rounded disabled:opacity-50 hover:opacity-90 transition"
            >
              Apply to {selectedPredictions.size} predictions
            </button>
          </div>
        )}
      </div>

      {/* Prediction List */}
      <div className="bg-surface border border-muted rounded-lg">
        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-secondary text-surface text-sm font-medium border-b border-muted">
          <div className="col-span-1 flex justify-center">
            <input
              type="checkbox"
              checked={predictions.length > 0 && selectedPredictions.size === predictions.length}
              onChange={handleSelectAll}
              className="rounded border-muted"
            />
          </div>
          <div className="col-span-3">Prediction</div>
          <div className="col-span-1">Creator</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2">Analytics</div>
          <div className="col-span-2">Engagement</div>
          <div className="col-span-1">Expires</div>
          <div className="col-span-1">Actions</div>
        </div>

        {/* Virtual Scrolling List */}
        <div className="h-96">
          {predictions.length > 0 ? (
            <List
              height={384}
              width="100%"
              itemCount={predictions.length}
              itemSize={80}
              itemData={rowData}
            >
              {PredictionRow}
            </List>
          ) : (
            <div className="flex items-center justify-center h-full text-tertiary">
              {loading ? 'Loading predictions...' : 'No predictions found'}
            </div>
          )}
        </div>

        {/* Pagination */}
        {paginationInfo.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-muted">
            <div className="text-sm text-tertiary">
              Showing {paginationInfo.currentPage * 25 + 1}-
              {Math.min((paginationInfo.currentPage + 1) * 25, paginationInfo.totalCount)} of{' '}
              {paginationInfo.totalCount}
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={!paginationInfo.hasPreviousPage}
                onClick={() => fetchPredictions(paginationInfo.currentPage - 1)}
                className="px-3 py-1 text-sm border border-muted rounded disabled:opacity-50 hover:bg-muted transition"
              >
                Previous
              </button>

              <span className="text-sm text-content">
                Page {paginationInfo.currentPage + 1} of {paginationInfo.totalPages}
              </span>

              <button
                disabled={!paginationInfo.hasNextPage}
                onClick={() => fetchPredictions(paginationInfo.currentPage + 1)}
                className="px-3 py-1 text-sm border border-muted rounded disabled:opacity-50 hover:bg-muted transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernPredictionQueue;
