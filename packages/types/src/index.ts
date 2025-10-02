/**
 * @ems/types - Main Barrel Export
 *
 * Centralized type exports for the entire Elon Musk Sucks platform.
 * Organized by architectural layer for clean imports.
 */

// ============================================================================
// Core Prisma Types & Helpers
// ============================================================================

export * from './prisma.js';

// ============================================================================
// Shared Utilities Layer
// ============================================================================

export * from './shared/index.js';

// ============================================================================
// Database Layer
// ============================================================================

export * from './database/user.js';
export * from './database/prediction.js';
export * from './database/betting.js';
export * from './database/content.js';
export * from './database/category.js';
export * from './database/tag.js';
export * from './database/timeline.js';
export * from './database/social.js';
export * from './database/pong.js';
export * from './database/admin.js';
export * from './database/achievement.js';
export * from './database/activity.js';

// ============================================================================
// API Layer
// ============================================================================

// API Request DTOs
export * from './api/requests/index.js';

// API Response DTOs
export * from './api/responses/index.js';

// API Socket Types
export * from './api/socket/index.js';

// ============================================================================
// Services Layer
// ============================================================================

export * from './services/index.js';

// ============================================================================
// Workers Layer
// ============================================================================

export * from './workers/index.js';

// ============================================================================
// Domain Layer
// ============================================================================

export * from './domain/index.js';

// ============================================================================
// Config Layer
// ============================================================================

export * from './config/index.js';
