// apps/server/src/repositories/CategoryRepository.ts
import { PrismaClient, Category } from '@prisma/client';
import { ICategoryRepository } from './interfaces/ICategoryRepository';

export class CategoryRepository implements ICategoryRepository {
  constructor(private prisma: PrismaClient = new PrismaClient()) {}

  // ============================================
  // CREATE
  // ============================================

  async createCategory(data: {
    name: string;
    slug: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<Category> {
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        icon: data.icon || null,
        color: data.color || null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  // ============================================
  // READ
  // ============================================

  async getCategoryById(id: number): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { id },
    });
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { slug },
    });
  }

  async getActiveCategories(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getAllCategories(): Promise<Category[]> {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getCategoriesWithStats(): Promise<
    Array<
      Category & {
        _count: {
          predictions: number;
        };
      }
    >
  > {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: {
            predictions: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ============================================
  // UPDATE
  // ============================================

  async updateCategory(
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
  ): Promise<Category | null> {
    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.slug && { slug: data.slug }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.icon !== undefined && { icon: data.icon }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });
    } catch {
      return null;
    }
  }

  async reorderCategories(categoryIds: number[]): Promise<void> {
    // Update sort order for each category
    await Promise.all(
      categoryIds.map((id, index) =>
        this.prisma.category.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  // ============================================
  // DELETE
  // ============================================

  async deactivateCategory(id: number): Promise<boolean> {
    try {
      await this.prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
      return true;
    } catch {
      return false;
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    try {
      // Check if category has predictions
      const count = await this.prisma.prediction.count({
        where: { categoryId: id },
      });

      if (count > 0) {
        return false; // Cannot delete category with predictions
      }

      await this.prisma.category.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // VALIDATION
  // ============================================

  async isCategoryActive(id: number): Promise<boolean> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { isActive: true },
    });

    return category?.isActive ?? false;
  }

  async isSlugAvailable(slug: string, excludeId?: number): Promise<boolean> {
    const existing = await this.prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return true;
    }

    return excludeId !== undefined && existing.id === excludeId;
  }

  async getDefaultCategory(): Promise<Category | null> {
    // Return first active category as default
    return this.prisma.category.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
