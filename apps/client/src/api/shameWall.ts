// Shame Wall API Client
import api from './axios';

export interface ShameWallEntry {
  userId: number;
  userName: string;
  avatarUrl?: string | null;
  reason: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  shameAchievements: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  banCount: number;
}

export interface ShameWallStats {
  totalBanned: number;
  permanentBans: number;
  temporaryBans: number;
  mostCommonReasons: Array<{ reason: string; count: number }>;
  shameAchievementCounts: Array<{ slug: string; title: string; count: number }>;
}

/**
 * Get current shame wall (public endpoint)
 */
export async function getShameWall(): Promise<ShameWallEntry[]> {
  const response = await api.get('/api/shame-wall');
  return response.data;
}

/**
 * Get shame wall statistics (public endpoint)
 */
export async function getShameWallStats(): Promise<ShameWallStats> {
  const response = await api.get('/api/shame-wall/stats');
  return response.data;
}
