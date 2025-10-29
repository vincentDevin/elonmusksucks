/**
 * Activity Response DTOs
 *
 * Response types for activity feed endpoints
 */

import type { UnifiedActivityEvent } from './user.js';

// ============================================================================
// Activity Feed Response
// ============================================================================

export interface ActivityFeedResponse {
  success: boolean;
  activities: UnifiedActivityEvent[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Alias for backwards compatibility
export type ActivityResponse = ActivityFeedResponse;
