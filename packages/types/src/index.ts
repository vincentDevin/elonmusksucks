/**
 * @ems/types - Main Barrel Export
 *
 * Centralized type exports for the entire Elon Musk Sucks platform.
 * Organized by architectural layer for clean imports.
 */

// ============================================================================
// Core Prisma Types & Helpers
// ============================================================================

export * from './prisma';

// ============================================================================
// Shared Utilities Layer
// ============================================================================

export * from './shared/constants';
export * from './shared/pagination';
export * from './shared/branded-types';
export * from './shared/enums';

// ============================================================================
// Database Layer
// ============================================================================

export * from './database/user';
export * from './database/prediction';
export * from './database/betting';
export * from './database/content';
export * from './database/category';
export * from './database/tag';
export * from './database/timeline';
export * from './database/social';
export * from './database/pong';
export * from './database/admin';
export * from './database/achievement';
export * from './database/activity';

// ============================================================================
// API Layer
// ============================================================================

// API Request DTOs
export * from './api/requests';

// API Response DTOs
export * from './api/responses';

// API Socket Types
export * from './api/socket';

// ============================================================================
// Services Layer
// ============================================================================

export * from './services';

// ============================================================================
// Workers Layer
// ============================================================================

export * from './workers';

// ============================================================================
// Domain Layer
// ============================================================================

export * from './domain';

// ============================================================================
// Config Layer
// ============================================================================

export * from './config';
