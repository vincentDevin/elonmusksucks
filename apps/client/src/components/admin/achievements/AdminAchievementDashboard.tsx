import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../../contexts/SocketContext';
import {
  getAllAchievements,
  getAchievementAnalytics,
  type AchievementWithStats,
  type AchievementAnalytics,
} from '../../../api/admin';

// Sub-components
import AdminAchievementOverview from './AdminAchievementOverview';
import AdminAchievementTabs from './AdminAchievementTabs';
import AdminAchievementFilters from './AdminAchievementFilters';
import AdminAchievementTable from './AdminAchievementTable';
import AdminAchievementBulkOperations from './AdminAchievementBulkOperations';
import AdminAchievementDetailsModal from './AdminAchievementDetailsModal';
import CreateAchievementModal from './CreateAchievementModal';
import { RuleBuilder } from './AchievementRuleBuilder/RuleBuilder';
import type { JsonRuleAchievementData } from '@ems/types';

export type TabType = 'overview' | 'active' | 'inactive' | 'rule-builder';

// Unused interface - keeping for future use
// interface AchievementSearchParams {
//   search?: string;
//   category?: string[];
//   rarity?: string[];
//   isActive?: boolean;
//   hasRule?: boolean;
//   page: number;
//   limit: number;
//   sortBy?: 'name' | 'category' | 'rarity' | 'createdAt' | 'totalUnlocks';
//   sortOrder?: 'asc' | 'desc';
// }

interface AdminAchievementDashboardProps {
  className?: string;
}

const AdminAchievementDashboard: React.FC<AdminAchievementDashboardProps> = ({
  className = '',
}) => {
  const socket = useSocket();
  const hasJoinedRoom = useRef(false);

  // Core state
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [achievements, setAchievements] = useState<AchievementWithStats[]>([]);
  const [analytics, setAnalytics] = useState<AchievementAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  // Selection state
  const [selectedAchievements, setSelectedAchievements] = useState<Set<number>>(new Set());

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // const [pageSize, setPageSize] = useState(25); // Removed unused state

  // Modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [achievementDetails, setAchievementDetails] = useState<AchievementWithStats | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Rule builder state (for rule-builder tab)
  const [currentRule, setCurrentRule] = useState<Partial<JsonRuleAchievementData>>({
    eventKeys: [],
    progress: { kind: 'count' },
    unlockWhen: {},
    counters: [],
  });
  // Commented out unused ruleValidation state
  // const [ruleValidation, setRuleValidation] = useState<RuleValidationResult>({
  //   isValid: false,
  //   errors: ['Rule is incomplete'],
  //   warnings: [],
  //   estimatedComplexity: 'low',
  //   complexityScore: 0,
  //   optimizationSuggestions: [],
  //   estimatedPerformanceImpact: 'low'
  // });

  // Real-time state
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  // Fetch achievements and analytics
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [achievementsData, analyticsData] = await Promise.all([
        getAllAchievements(),
        getAchievementAnalytics(),
      ]);
      setAchievements(achievementsData);
      setAnalytics(analyticsData);

      // Debug: Log rarity values in development
      if (process.env.NODE_ENV === 'development') {
        console.log(
          'Achievement rarities:',
          achievementsData.map((a) => ({ id: a.id, name: a.name, rarity: a.rarity })),
        );
      }
    } catch (error) {
      console.error('Failed to fetch achievement data:', error);
      setAchievements([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket room management
  useEffect(() => {
    if (!socket || hasJoinedRoom.current) return;

    socket.emit('join', 'admin:achievements');
    hasJoinedRoom.current = true;

    return () => {
      if (hasJoinedRoom.current) {
        socket.emit('leave', 'admin:achievements');
        hasJoinedRoom.current = false;
      }
    };
  }, [socket]);

  // Real-time event listeners
  useEffect(() => {
    if (!socket || !realtimeEnabled) return;

    const handleAchievementUpdate = () => {
      setLastUpdateTime(new Date().toLocaleTimeString());
      // Debounced refresh to avoid excessive API calls
      setTimeout(() => {
        if (realtimeEnabled) {
          fetchData();
        }
      }, 1000);
    };

    // Register event listeners for achievement-related events
    socket.on('achievement:created', handleAchievementUpdate);
    socket.on('achievement:updated', handleAchievementUpdate);
    socket.on('achievement:deleted', handleAchievementUpdate);
    socket.on('achievement:granted', handleAchievementUpdate);
    socket.on('achievement:revoked', handleAchievementUpdate);

    // Cleanup function
    return () => {
      socket.off('achievement:created', handleAchievementUpdate);
      socket.off('achievement:updated', handleAchievementUpdate);
      socket.off('achievement:deleted', handleAchievementUpdate);
      socket.off('achievement:granted', handleAchievementUpdate);
      socket.off('achievement:revoked', handleAchievementUpdate);
    };
  }, [socket, realtimeEnabled, fetchData]);

  // Selection handlers
  const handleAchievementSelect = useCallback((achievementId: number, selected: boolean) => {
    setSelectedAchievements((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(achievementId);
      } else {
        newSet.delete(achievementId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = () => {
    const filteredAchievements = getFilteredAchievements();
    if (selectedAchievements.size === filteredAchievements.length) {
      setSelectedAchievements(new Set());
    } else {
      setSelectedAchievements(new Set(filteredAchievements.map((a) => a.id)));
    }
  };

  // Action handlers
  const handleAchievementAction = async (achievementId: number, action: string) => {
    if (action === 'details') {
      setIsLoadingDetails(true);
      try {
        const achievement = achievements.find((a) => a.id === achievementId);
        if (achievement) {
          setAchievementDetails(achievement);
          setDetailsModalOpen(true);
        }
      } catch (error) {
        console.error('Failed to load achievement details:', error);
      } finally {
        setIsLoadingDetails(false);
      }
      return;
    }

    if (action === 'edit') {
      const achievement = achievements.find((a) => a.id === achievementId);
      if (achievement) {
        setAchievementDetails(achievement);
        setCreateModalOpen(true);
      }
      return;
    }

    // Handle other actions (activate, deactivate, delete, etc.)
    try {
      // Implementation will depend on specific API endpoints
      console.log(`Action ${action} on achievement ${achievementId}`);
      await fetchData(); // Refresh data after action
    } catch (error) {
      console.error(`Failed to ${action} achievement:`, error);
    }
  };

  // Bulk operations
  const handleBulkOperation = async (operation: string) => {
    if (selectedAchievements.size === 0) return;

    try {
      // Implementation will depend on specific bulk operation endpoints
      console.log(`Bulk operation ${operation} on ${selectedAchievements.size} achievements`);
      setSelectedAchievements(new Set());
      await fetchData();
    } catch (error) {
      console.error('Bulk operation failed:', error);
      throw error;
    }
  };

  // Filter functions
  const getFilteredAchievements = () => {
    return achievements.filter((achievement) => {
      if (
        searchText &&
        !achievement.name.toLowerCase().includes(searchText.toLowerCase()) &&
        !achievement.description?.toLowerCase().includes(searchText.toLowerCase())
      ) {
        return false;
      }
      if (selectedCategory && achievement.category !== selectedCategory) {
        return false;
      }
      if (selectedRarity && achievement.rarity !== selectedRarity) {
        return false;
      }
      if (showActiveOnly && !achievement.isActive) {
        return false;
      }
      return true;
    });
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedCategory('');
    setSelectedRarity('');
    setShowActiveOnly(false);
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  // Calculate tab counts
  const tabCounts = {
    overview: achievements.length,
    active: achievements.filter((a) => a.isActive).length,
    inactive: achievements.filter((a) => !a.isActive).length,
    'rule-builder': 0, // Rule data not available in current schema
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      <AdminAchievementOverview
        analytics={analytics}
        loading={loading}
        lastUpdateTime={lastUpdateTime}
        realtimeEnabled={realtimeEnabled}
        onRealtimeToggle={setRealtimeEnabled}
        onCreateNew={() => setCreateModalOpen(true)}
      />

      {/* Tabs */}
      <AdminAchievementTabs activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />

      {activeTab === 'rule-builder' ? (
        /* Rule Builder Tab */
        <div className="bg-surface rounded-lg border border-muted p-6">
          <h3 className="text-lg font-semibold text-content mb-6">Achievement Rule Builder</h3>
          <RuleBuilder
            initialRule={currentRule}
            onChange={(rule, _validation) => {
              setCurrentRule(rule);
            }}
          />
        </div>
      ) : (
        <>
          {/* Filters */}
          <AdminAchievementFilters
            searchText={searchText}
            onSearchChange={setSearchText}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedRarity={selectedRarity}
            onRarityChange={setSelectedRarity}
            showActiveOnly={showActiveOnly}
            onActiveOnlyChange={setShowActiveOnly}
            sortBy={sortBy}
            onSortChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            onClearFilters={handleClearFilters}
            achievements={achievements}
          />

          {/* Bulk Operations */}
          {selectedAchievements.size > 0 && (
            <AdminAchievementBulkOperations
              selectedAchievements={selectedAchievements}
              currentTab={activeTab}
              onBulkOperation={handleBulkOperation}
              onClearSelection={() => setSelectedAchievements(new Set())}
            />
          )}

          {/* Achievements Table */}
          <AdminAchievementTable
            achievements={getFilteredAchievements()}
            selectedAchievements={selectedAchievements}
            currentTab={activeTab}
            onAchievementSelect={handleAchievementSelect}
            onAchievementAction={handleAchievementAction}
            onSelectAll={handleSelectAll}
            loading={loading}
            isLoadingDetails={isLoadingDetails}
          />
        </>
      )}

      {/* Achievement Details Modal */}
      {detailsModalOpen && achievementDetails && (
        <AdminAchievementDetailsModal
          achievement={achievementDetails}
          onClose={() => {
            setDetailsModalOpen(false);
            setAchievementDetails(null);
          }}
        />
      )}

      {/* Create/Edit Achievement Modal */}
      {createModalOpen && (
        <CreateAchievementModal
          onClose={() => {
            setCreateModalOpen(false);
            setAchievementDetails(null);
          }}
          onSubmit={async (_achievementData) => {
            // Handle achievement creation here
            await fetchData();
            setCreateModalOpen(false);
            setAchievementDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminAchievementDashboard;
