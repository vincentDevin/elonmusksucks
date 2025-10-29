/**
 * System Constants
 *
 * Global constants used across the application
 */

// System user IDs
export const SYSTEM_AI_USER_ID = -1; // Canonical AI user ID for Pong matches

// Input Size Limits
export const InputSizeLimits = {
  ChatMessage: 1000, // Characters
  PredictionTitle: 200, // Characters
  PredictionDescription: 2000, // Characters
  PredictionOptionText: 100, // Characters per option
} as const;

export type InputSizeLimit = (typeof InputSizeLimits)[keyof typeof InputSizeLimits];
