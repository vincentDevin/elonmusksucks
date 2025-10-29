/**
 * Category Database Types
 *
 * Types for the Category model (normalized from Prediction.category string)
 */

import type { PrismaCategory } from '../prisma';

// ============================================================================
// Category Types
// ============================================================================

export type DbCategory = PrismaCategory;

export interface PublicCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// CategoryWithStats is exported from prisma.ts - import it when needed
