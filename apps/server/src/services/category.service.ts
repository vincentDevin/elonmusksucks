// apps/server/src/services/category.service.ts
// -----------------------------------------------------------------------------
// Business logic layer for Category operations
// Uses CategoryRepository for data access, no direct Prisma operations
// -----------------------------------------------------------------------------

import { CategoryRepository } from '../repositories/CategoryRepository';
import type { ICategoryRepository } from '../repositories/interfaces/ICategoryRepository';
import type { PrismaCategory } from '@ems/types';

export class CategoryService {
  private repo: ICategoryRepository;

  constructor(repo: ICategoryRepository = new CategoryRepository()) {
    this.repo = repo;
  }

  /**
   * Get all active categories ordered by sortOrder
   */
  async getActiveCategories(): Promise<PrismaCategory[]> {
    return await this.repo.getActiveCategories();
  }

  /**
   * Get a category by its ID
   * Throws error if not found
   */
  async getCategoryById(id: number): Promise<PrismaCategory> {
    const category = await this.repo.getCategoryById(id);
    if (!category) {
      throw new Error(`Category with id ${id} not found`);
    }
    return category;
  }

  /**
   * Get a category by its slug
   */
  async getCategoryBySlug(slug: string): Promise<PrismaCategory | null> {
    return await this.repo.getCategoryBySlug(slug);
  }

  /**
   * Get all categories including inactive ones
   */
  async getAllCategories(): Promise<PrismaCategory[]> {
    return await this.repo.getAllCategories();
  }

  /**
   * Get categories with prediction counts
   */
  async getCategoriesWithStats() {
    return await this.repo.getCategoriesWithStats();
  }

  /**
   * Validate that a category exists and is active
   * Returns true if valid, false otherwise
   */
  async validateCategoryExists(categoryId: number): Promise<boolean> {
    return await this.repo.isCategoryActive(categoryId);
  }

  /**
   * Get the default category (first active category)
   */
  async getDefaultCategory(): Promise<PrismaCategory | null> {
    return await this.repo.getDefaultCategory();
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
