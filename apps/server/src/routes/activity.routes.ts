import { Router } from 'express';
import { unifiedActivityService } from '../services/unifiedActivity.service';

const router = Router();

/**
 * GET /api/activity/recent
 * Get recent activities from Redis cache
 * Used for initial page load to bootstrap activity feed
 * PUBLIC ENDPOINT - No authentication required
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const activities = await unifiedActivityService.getRecentActivities(limit);

    res.json({
      success: true,
      activities,
      count: activities.length,
      cached: true, // Indicates this data came from Redis cache
    });
  } catch (error) {
    console.error('[activity-routes] Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activities',
    });
  }
});

/**
 * GET /api/activity/public
 * Get public activities from database (fallback)
 * Used when Redis cache is not available
 * PUBLIC ENDPOINT - No authentication required
 */
router.get('/public', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const activities = await unifiedActivityService.getPublicActivities(limit);

    res.json({
      success: true,
      activities,
      count: activities.length,
      cached: false, // Indicates this data came from database
    });
  } catch (error) {
    console.error('[activity-routes] Error fetching public activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch public activities',
    });
  }
});

export default router;
