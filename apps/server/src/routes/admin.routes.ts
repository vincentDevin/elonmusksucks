// apps/server/src/routes/admin.routes.ts
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import * as adminController from '../controllers/admin.controller';
import feedsRoutes from './feeds.routes';
import unifiedContentRoutes from './unified-content.routes';
import { AdminActions } from '@ems/types';
import { uploadConfig, validateFileContent } from '../middleware/fileValidation.middleware';

const router = Router();

/**
 * Middleware to log admin action attempts for RBAC audit
 */
function logAdminAction(action: string) {
  return (req: any, _res: any, next: any) => {
    console.log(`[admin-rbac] Route ${req.method} ${req.path} maps to action: ${action}`);
    next();
  };
}

// All admin routes require a valid access token and ADMIN role
router.use(requireAuth, requireAdmin);

// — Enhanced User Management —
router.get('/users', logAdminAction(AdminActions.ManageUsers), adminController.getUsers); // Legacy endpoint
router.get('/users/search', logAdminAction(AdminActions.ManageUsers), adminController.searchUsers); // New enhanced search
router.get('/users/:userId/details', adminController.getUserDetails); // User details
router.post('/users/bulk', adminController.bulkUpdateUsers); // Bulk operations
router.patch('/users/:id/role', adminController.updateUserRole);
router.patch('/users/:id/activate', adminController.activateUser);
router.patch('/users/:id/balance', adminController.updateUserBalance);

// — Admin Avatar Management —
router.post(
  '/users/:userId/profile-picture',
  uploadConfig.single('image'),
  validateFileContent,
  adminController.uploadUserProfileImage,
);
router.delete('/users/:userId/profile-picture', adminController.deleteUserProfileImage);

// — Site Default Avatar Management —
router.get('/settings/default-avatar', adminController.getDefaultAvatar);
router.post(
  '/settings/default-avatar',
  uploadConfig.single('image'),
  validateFileContent,
  adminController.uploadDefaultAvatar,
);
router.delete('/settings/default-avatar', adminController.deleteDefaultAvatar);

// — Enhanced Prediction Management —
router.get('/predictions', adminController.getPredictions); // Legacy endpoint
router.get('/predictions/search', adminController.searchPredictions); // New enhanced search
router.get('/predictions/:predictionId/details', adminController.getPredictionDetails); // Prediction details
router.post('/predictions/bulk', adminController.bulkUpdatePredictions); // Bulk operations
router.patch('/predictions/:id/approve', adminController.approvePrediction);
router.patch('/predictions/:id/reject', adminController.rejectPrediction);
router.patch(
  '/predictions/:id/resolve',
  logAdminAction(AdminActions.ManagePredictions),
  adminController.resolvePrediction,
);

// — Enhanced Financial Operations Dashboard —
router.get('/financial/search', adminController.searchFinancialData);
router.get('/financial/analytics', adminController.getFinancialAnalytics);
router.get('/financial/unified-analytics', adminController.getUnifiedAnalytics); // NEW: Unified analytics endpoint
router.post('/financial/bulk', adminController.bulkFinancialOperation);
router.get('/financial/export', adminController.exportFinancialData);

// — Legacy Bet & Transaction Oversight (deprecated) —
router.get('/bets', logAdminAction(AdminActions.ManageBets), adminController.getBets);
router.patch('/bets/:id/refund', adminController.refundBet);
router.get('/transactions', adminController.getTransactions);

// — Enhanced Badge & Achievement System —
router.get('/badges/search', adminController.searchBadges);
router.get('/badges/:badgeId/details', adminController.getBadgeDetails);
router.post('/badges/create', adminController.createBadgeWithCategories);
router.put('/badges/:badgeId', adminController.updateBadge);
router.delete('/badges/:badgeId', adminController.deleteBadge);
router.get('/badges/analytics', adminController.getBadgeAnalytics);
router.post('/badges/bulk', adminController.bulkBadgeOperation);
router.get('/badge-categories', adminController.getBadgeCategories);
router.post('/badge-categories', adminController.createBadgeCategory);

// — Achievement Management System —
router.get('/achievements', adminController.getAllAchievements);
router.get('/achievements/analytics', adminController.getAchievementAnalytics);
router.get('/achievements/:id', adminController.getAchievementById);
router.post('/achievements', adminController.createAchievement);
router.put('/achievements/:id', adminController.updateAchievement);
router.delete('/achievements/:id', adminController.deleteAchievement);
router.post('/achievements/:id/grant/:userId', adminController.grantAchievement);
router.delete('/achievements/:id/revoke/:userId', adminController.revokeAchievement);
router.post('/achievements/:id/bulk-grant', adminController.bulkGrantAchievement);
router.get('/achievements/:id/users', adminController.getUsersWithAchievement);

// Rule simulation endpoints
router.post('/achievements/rules/simulate', adminController.simulateRule);
router.post('/achievements/rules/generate-test-events', adminController.generateTestEvents);
router.post('/achievements/rules/quick-simulate', adminController.quickSimulate);

// — Shame Wall Management System —
router.post('/bans', adminController.issueBan);
router.delete('/bans/:banId', adminController.liftBan);
router.get('/bans/history', adminController.getBanHistory);
router.post('/shame-achievements', adminController.awardShameAchievement);

// — Advanced Analytics & Reporting —
router.get('/analytics/executive-dashboard', adminController.getExecutiveDashboard);
router.get('/analytics/user-behavior', adminController.getUserBehaviorAnalytics);
router.get('/analytics/predictive', adminController.getPredictiveAnalytics);
router.get('/analytics/reports/:reportType', adminController.generateCustomReport);
router.get('/analytics/realtime', adminController.getRealtimeMetrics);
router.get('/analytics/export', adminController.exportAnalyticsData);

// — Legacy Badge & Content Moderation (deprecated) —
router.get('/posts', adminController.getPosts);
router.delete('/posts/:id', adminController.deletePost);
router.get('/badges', adminController.getBadges);
router.post('/badges', adminController.createBadge);
router.patch('/users/:id/badges', adminController.assignBadge);
router.delete('/users/:id/badges/:badgeId', adminController.revokeBadge);

// — Leaderboard & Stats —
router.get('/stats/:userId', adminController.getUserStats);

// — RSS Feeds Management —
// Mount the feeds routes under /feeds (so they become /api/admin/feeds/*)
router.use('/feeds', feedsRoutes);

// — Unified Content Management —
// Mount the unified content routes under /unified-content (so they become /api/admin/unified-content/*)
router.use('/unified-content', unifiedContentRoutes);

// RBAC Audit Note: All routes currently require ADMIN role via requireAdmin middleware
// Future enhancement: Implement granular permissions per action type

export default router;
