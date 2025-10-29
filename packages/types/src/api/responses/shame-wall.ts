/**
 * Shame Wall Response DTOs
 *
 * Response types for shame wall (banned users wall) endpoints
 */

// ============================================================================
// Shame Wall Entry
// ============================================================================

export interface ShameWallEntryResponse {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string | null;
  reason: string;
  bannedAt: string;
  banType: 'TEMPORARY' | 'PERMANENT';
  expiresAt: string | null;
  offenseCount: number;
  badges?: string[]; // Badge of shame types
}

// ============================================================================
// Shame Wall Stats
// ============================================================================

export interface ShameWallStatsResponse {
  totalBans: number;
  activeBans: number;
  permanentBans: number;
  temporaryBans: number;
  mostCommonReason: string;
  averageBanDuration: number; // in hours
}
