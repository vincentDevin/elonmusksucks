/**
 * Pagination and Query Types
 *
 * Shared types for pagination and querying
 */

// ============================================================================
// Basic Pagination
// ============================================================================

export interface PageQuery {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface CursorPage<T> {
  items: T[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
    total?: number;
  };
}

// ============================================================================
// Sort Options
// ============================================================================

export const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrder = (typeof SORT_ORDERS)[keyof typeof SORT_ORDERS];

// ============================================================================
// Date Range
// ============================================================================

export interface DateRange {
  from?: Date | string;
  to?: Date | string;
}
