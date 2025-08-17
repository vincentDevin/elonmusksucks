// apps/client/src/api/activity.ts
import axios from 'axios';

// Create a public API client that doesn't require authentication
const publicApi = axios.create({
  baseURL: '/api', // Use relative path to current domain
  withCredentials: false, // No auth cookies needed for public endpoints
  headers: { 'Content-Type': 'application/json' },
});

export interface ActivityResponse {
  success: boolean;
  activities: any[];
  count: number;
  cached: boolean;
}

/**
 * Get recent activities from Redis cache
 * Used for initial page load to bootstrap activity feed
 * PUBLIC ENDPOINT - No authentication required
 */
export const getRecentActivities = async (limit = 50): Promise<ActivityResponse> => {
  const response = await publicApi.get(`/activity/recent?limit=${limit}`);
  return response.data;
};

/**
 * Get public activities from database (fallback)
 * Used when Redis cache is not available
 * PUBLIC ENDPOINT - No authentication required
 */
export const getPublicActivities = async (limit = 50): Promise<ActivityResponse> => {
  const response = await publicApi.get(`/activity/public?limit=${limit}`);
  return response.data;
};
