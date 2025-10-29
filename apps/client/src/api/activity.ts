// apps/client/src/api/activity.ts
import axios from 'axios';
import type { ActivityFeedResponse } from '@ems/types';

// Create a public API client that doesn't require authentication
const publicApi = axios.create({
  baseURL: '/api', // Use relative path to current domain
  withCredentials: false, // No auth cookies needed for public endpoints
  headers: { 'Content-Type': 'application/json' },
});

// Type alias for backwards compatibility
export type ActivityResponse = ActivityFeedResponse;

/**
 * Get recent activities from Redis cache
 * Used for initial page load to bootstrap activity feed
 * PUBLIC ENDPOINT - No authentication required
 */
export const getRecentActivities = async (limit = 50): Promise<ActivityResponse> => {
  try {
    console.log('[activity.ts] Fetching recent activities, limit:', limit);
    const response = await publicApi.get(`/activity/recent?limit=${limit}`);
    console.log('[activity.ts] Response received:', response.status, response.data);
    return response.data;
  } catch (error: any) {
    console.error('[activity.ts] Error fetching activities:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    throw error;
  }
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
