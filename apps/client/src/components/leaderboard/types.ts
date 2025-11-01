// Unified leaderboard types for consistent component architecture
import type { PublicLeaderboardEntry, PongLeaderboardView } from '@ems/types';
import type { ShameWallEntry } from '../../api/shameWall';
import type { BadgeData } from '../../types/badges';

export type LeaderboardVariant = 'betting' | 'pong' | 'shame';

// Unified entry type that can represent any leaderboard entry
export interface UnifiedLeaderboardEntry {
  id: number;
  userName: string;
  avatarUrl?: string;
  primaryStat: {
    label: string;
    value: string;
    highlight?: boolean;
    color?: string;
  };
  secondaryStats: Array<{
    label: string;
    value: string;
    highlight?: boolean;
    color?: string;
  }>;
  badges?: BadgeData[];
  variant: LeaderboardVariant;
  rawData: PublicLeaderboardEntry | PongLeaderboardView | ShameWallEntry;
}

// Header stats configuration
export interface LeaderboardHeaderStats {
  primary: {
    value: string;
    label: string;
  };
  secondary: Array<{
    value: string;
    label: string;
  }>;
}

// Filter configuration for each variant
export interface FilterOption {
  key: string;
  label: string;
  description?: string;
}

export interface FilterGroup {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  show?: boolean;
}

// Control bar configuration
export interface ControlBarConfig {
  variant: LeaderboardVariant;
  filterGroups: FilterGroup[];
  actions: Array<{
    label: string;
    icon?: any;
    onClick: () => void;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}
