/**
 * Active User Cache Types
 *
 * Types for the active user caching system used to optimize N+1 query patterns
 * in leaderboards, chat, and other high-traffic features.
 */

/**
 * Cached active user profile data
 * Optimized for read-heavy operations (leaderboards, chat history, etc.)
 */
export interface ActiveUserCache {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
  muskBucks: string;
  profilePictureKey: string | null;
  lastSeen: string;
}
