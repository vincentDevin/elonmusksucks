// apps/server/src/repositories/interfaces/IUnifiedContentRepository.ts
import type {
  UnifiedContentFilters,
  UnifiedContentItem,
  UnifiedContentType,
  UnifiedContentStatus,
} from '@ems/types';

/**
 * Unified Content Repository Interface
 *
 * Provides a unified interface for querying across Article, Content, and Prediction models
 */
export interface IUnifiedContentRepository {
  /**
   * Get unified content with filtering and pagination
   */
  getUnifiedContent(filters: UnifiedContentFilters): Promise<{
    items: UnifiedContentItem[];
    total: number;
  }>;

  /**
   * Get single unified content item by ID
   */
  getUnifiedContentById(unifiedId: string): Promise<UnifiedContentItem | null>;

  /**
   * Get content counts by type and status
   */
  getContentCounts(): Promise<{
    byType: Record<UnifiedContentType, number>;
    byStatus: Record<UnifiedContentStatus, number>;
    total: number;
  }>;

  /**
   * Delete content by unified ID (soft delete for Content, hard delete for Articles)
   */
  deleteUnifiedContent(unifiedId: string, deletedBy: number): Promise<boolean>;
}
