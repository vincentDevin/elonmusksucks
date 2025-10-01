// apps/server/src/repositories/interfaces/ICategoryRepository.ts
import type { PrismaCategory } from '@ems/types';

/**
 * Category Repository
 * Manages normalized prediction categories
 */
export interface ICategoryRepository {
  // ============================================
  // CREATE
  // ============================================

  /** Create a new category */
  createCategory(data: {
    name: string;
    slug: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<PrismaCategory>;

  // ============================================
  // READ
  // ============================================

  /** Get category by ID */
  getCategoryById(id: number): Promise<PrismaCategory | null>;

  /** Get category by slug */
  getCategoryBySlug(slug: string): Promise<PrismaCategory | null>;

  /** Get all active categories */
  getActiveCategories(): Promise<PrismaCategory[]>;

  /** Get all categories (including inactive) */
  getAllCategories(): Promise<PrismaCategory[]>;

  /** Get categories with prediction count */
  getCategoriesWithStats(): Promise<
    Array<
      PrismaCategory & {
        _count: {
          predictions: number;
        };
      }
    >
  >;

  // ============================================
  // UPDATE
  // ============================================

  /** Update category */
  updateCategory(
    id: number,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      icon?: string | null;
      color?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
  ): Promise<PrismaCategory | null>;

  /** Reorder categories */
  reorderCategories(categoryIds: number[]): Promise<void>;

  // ============================================
  // DELETE
  // ============================================

  /** Soft delete category (set isActive = false) */
  deactivateCategory(id: number): Promise<boolean>;

  /** Hard delete category (permanent removal) - only if no predictions */
  deleteCategory(id: number): Promise<boolean>;

  // ============================================
  // VALIDATION
  // ============================================

  /** Check if category exists and is active */
  isCategoryActive(id: number): Promise<boolean>;

  /** Check if slug is available */
  isSlugAvailable(slug: string, excludeId?: number): Promise<boolean>;

  /** Get default category (for fallback) */
  getDefaultCategory(): Promise<PrismaCategory | null>;
}
