import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  searchPredictions,
  bulkUpdatePredictions,
  getPredictionDetails,
  resolvePrediction,
} from '../../../api/admin';
import { useSocket } from '../../../contexts/SocketContext';
import type {
  PredictionSearchParams,
  DetailedPrediction,
  PaginatedPredictions,
  BulkPredictionOperation,
} from '../../../api/admin';

// Sub-components
import PredictionStatsOverview from './PredictionStatsOverview';
import PredictionTabs, { type TabType } from './PredictionTabs';
import PredictionFilters from './PredictionFilters';
import PredictionTable from './PredictionTable';
import PredictionBulkOperations from './PredictionBulkOperations';
import CompactPagination from './CompactPagination';
import ResolvePredictionModal from './ResolvePredictionModal';
import AdminPredictionDetailsModal from './AdminPredictionDetailsModal';

interface PredictionDashboardProps {
  className?: string;
}

const PredictionDashboard: React.FC<PredictionDashboardProps> = ({ className = '' }) => {
  const socket = useSocket();
  const hasJoinedRoom = useRef(false);

  // Core state
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

  // Selection state
  const [selectedPredictions, setSelectedPredictions] = useState<Set<number>>(new Set());

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(25);

  // Resolve modal state
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [predictionToResolve, setPredictionToResolve] = useState<DetailedPrediction | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [predictionDetails, setPredictionDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Real-time state
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  // Fetch predictions with filters
  const fetchPredictions = useCallback(
    async (page = 0) => {
      setLoading(true);
      try {
        const params: PredictionSearchParams = {
          search: searchText.trim() || undefined,
          category: selectedCategory ? [selectedCategory] : undefined,
          creatorId: selectedCreator ? parseInt(selectedCreator, 10) : undefined,
          status: [activeTab],
          page,
          limit: pageSize,
          sortBy: sortBy as any,
          sortOrder,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
        };

        const results = await searchPredictions(params);
        setPredictions(results.predictions);
        setPaginationInfo({
          totalCount: results.totalCount,
          totalPages: results.totalPages,
          currentPage: results.currentPage,
          hasNextPage: results.hasNextPage,
          hasPreviousPage: results.hasPreviousPage,
          analytics: results.analytics || {
            totalPending: 0,
            totalApproved: 0,
            totalResolved: 0,
            totalRejected: 0,
            avgResolutionTime: 0,
          },
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
          analytics: {
            totalPending: 0,
            totalApproved: 0,
            totalResolved: 0,
            totalRejected: 0,
            avgResolutionTime: 0,
          },
        });
      } finally {
        setLoading(false);
      }
    },
    [
      activeTab,
      searchText,
      selectedCategory,
      selectedCreator,
      dateRange,
      sortBy,
      sortOrder,
      pageSize,
    ],
  );

  // Refetch when dependencies change
  useEffect(() => {
    fetchPredictions(0);
    setSelectedPredictions(new Set());
  }, [fetchPredictions]);

  // Single socket room join on mount (fixes spam issue)
  useEffect(() => {
    if (!socket || hasJoinedRoom.current) return;

    socket.emit('join', 'admin:predictions');
    hasJoinedRoom.current = true;

    return () => {
      if (hasJoinedRoom.current) {
        socket.emit('leave', 'admin:predictions');
        hasJoinedRoom.current = false;
      }
    };
  }, [socket]);

  // Real-time event listeners (separate from room management)
  useEffect(() => {
    if (!socket || !realtimeEnabled) return;

    const handlePredictionUpdate = () => {
      setLastUpdateTime(new Date().toLocaleTimeString());
      // Debounced refresh to avoid excessive API calls
      setTimeout(() => {
        if (realtimeEnabled) {
          fetchPredictions(paginationInfo.currentPage);
        }
      }, 1000);
    };

    // Register event listeners for prediction-related events
    socket.on('prediction:created', handlePredictionUpdate);
    socket.on('prediction:approved', handlePredictionUpdate);
    socket.on('prediction:rejected', handlePredictionUpdate);
    socket.on('prediction:resolved', handlePredictionUpdate);
    socket.on('prediction:status_change', handlePredictionUpdate);
    socket.on('bet:placed', handlePredictionUpdate); // May affect prediction analytics
    socket.on('parlay:placed', handlePredictionUpdate); // May affect prediction analytics

    // Cleanup function
    return () => {
      socket.off('prediction:created', handlePredictionUpdate);
      socket.off('prediction:approved', handlePredictionUpdate);
      socket.off('prediction:rejected', handlePredictionUpdate);
      socket.off('prediction:resolved', handlePredictionUpdate);
      socket.off('prediction:status_change', handlePredictionUpdate);
      socket.off('bet:placed', handlePredictionUpdate);
      socket.off('parlay:placed', handlePredictionUpdate);
    };
  }, [socket, realtimeEnabled, paginationInfo.currentPage, fetchPredictions]);

  // Selection handlers
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

  // Action handlers
  const handlePredictionAction = async (predictionId: number, action: string) => {
    if (action === 'details') {
      setIsLoadingDetails(true);
      try {
        const details = await getPredictionDetails(predictionId);
        setPredictionDetails(details);
        setDetailsModalOpen(true);
      } catch (error) {
        console.error('Failed to fetch prediction details:', error);
      } finally {
        setIsLoadingDetails(false);
      }
      return;
    }

    if (action === 'resolve') {
      const prediction = predictions.find((p) => p.id === predictionId);
      if (prediction) {
        setPredictionToResolve(prediction);
        setResolveModalOpen(true);
      }
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

  // Bulk operations
  const handleBulkOperation = async (operation: BulkPredictionOperation['operation']) => {
    if (selectedPredictions.size === 0) return;

    try {
      const bulkOp: BulkPredictionOperation = {
        predictionIds: Array.from(selectedPredictions),
        operation,
      };

      await bulkUpdatePredictions(bulkOp);
      setSelectedPredictions(new Set());
      fetchPredictions(paginationInfo.currentPage);
    } catch (error) {
      console.error('Bulk operation failed:', error);
      throw error; // Re-throw for component handling
    }
  };

  // Resolve prediction
  const handleResolve = async (winningOptionId: number) => {
    if (!predictionToResolve) return;

    setIsResolving(true);
    try {
      await resolvePrediction(predictionToResolve.id, winningOptionId);
      fetchPredictions(paginationInfo.currentPage);
      setResolveModalOpen(false);
      setPredictionToResolve(null);
    } catch (error) {
      console.error('Failed to resolve prediction:', error);
      throw error;
    } finally {
      setIsResolving(false);
    }
  };

  // Filter handlers
  const handleClearFilters = () => {
    setSearchText('');
    setSelectedCategory('');
    setSelectedCreator('');
    setDateRange({ start: '', end: '' });
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      <PredictionStatsOverview
        analytics={
          paginationInfo.analytics || {
            totalPending: 0,
            totalApproved: 0,
            totalResolved: 0,
            totalRejected: 0,
            avgResolutionTime: 0,
          }
        }
        loading={loading}
        lastUpdateTime={lastUpdateTime}
        realtimeEnabled={realtimeEnabled}
        onRealtimeToggle={setRealtimeEnabled}
      />

      {/* Tabs */}
      <PredictionTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        analytics={
          paginationInfo.analytics || {
            totalPending: 0,
            totalApproved: 0,
            totalResolved: 0,
            totalRejected: 0,
          }
        }
      />

      {/* Filters */}
      <PredictionFilters
        searchText={searchText}
        onSearchChange={setSearchText}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedCreator={selectedCreator}
        onCreatorChange={setSelectedCreator}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onClearFilters={handleClearFilters}
      />

      {/* Bulk Operations */}
      {selectedPredictions.size > 0 && (
        <PredictionBulkOperations
          selectedPredictions={selectedPredictions}
          currentTab={activeTab}
          onBulkOperation={handleBulkOperation}
          onClearSelection={() => setSelectedPredictions(new Set())}
        />
      )}

      {/* Predictions Table */}
      <PredictionTable
        predictions={predictions}
        selectedPredictions={selectedPredictions}
        currentTab={activeTab}
        onPredictionSelect={handlePredictionSelect}
        onPredictionAction={handlePredictionAction}
        onSelectAll={handleSelectAll}
        loading={loading}
        isLoadingDetails={isLoadingDetails}
      />

      {/* Pagination */}
      {paginationInfo.totalPages > 1 && (
        <CompactPagination
          currentPage={paginationInfo.currentPage}
          totalPages={paginationInfo.totalPages}
          pageSize={pageSize}
          totalItems={paginationInfo.totalCount}
          hasNextPage={paginationInfo.hasNextPage}
          onPageChange={(page) => fetchPredictions(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            fetchPredictions(0);
          }}
        />
      )}

      {/* Resolve Prediction Modal */}
      {resolveModalOpen && predictionToResolve && (
        <ResolvePredictionModal
          prediction={{
            ...predictionToResolve,
            createdAt:
              predictionToResolve.createdAt instanceof Date
                ? predictionToResolve.createdAt.toISOString()
                : predictionToResolve.createdAt || new Date().toISOString(),
            expiresAt:
              predictionToResolve.expiresAt instanceof Date
                ? predictionToResolve.expiresAt.toISOString()
                : predictionToResolve.expiresAt || new Date().toISOString(),
          }}
          onResolve={handleResolve}
          onClose={() => {
            setResolveModalOpen(false);
            setPredictionToResolve(null);
          }}
          isResolving={isResolving}
        />
      )}

      {/* Admin Prediction Details Modal */}
      {detailsModalOpen && predictionDetails && (
        <AdminPredictionDetailsModal
          prediction={predictionDetails}
          onClose={() => {
            setDetailsModalOpen(false);
            setPredictionDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default PredictionDashboard;
