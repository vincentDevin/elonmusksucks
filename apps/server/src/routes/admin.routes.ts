// apps/server/src/routes/admin.routes.ts
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// All admin routes require a valid access token and ADMIN role
router.use(requireAuth, requireAdmin);

// — Enhanced User Management —
router.get('/users', adminController.getUsers); // Legacy endpoint
router.get('/users/search', adminController.searchUsers); // New enhanced search
router.get('/users/:userId/details', adminController.getUserDetails); // User details
router.post('/users/bulk', adminController.bulkUpdateUsers); // Bulk operations
router.patch('/users/:id/role', adminController.updateUserRole);
router.patch('/users/:id/activate', adminController.activateUser);
router.patch('/users/:id/balance', adminController.updateUserBalance);

// — Enhanced Prediction Management —
router.get('/predictions', adminController.getPredictions); // Legacy endpoint
router.get('/predictions/search', adminController.searchPredictions); // New enhanced search
router.get('/predictions/:predictionId/details', adminController.getPredictionDetails); // Prediction details
router.post('/predictions/bulk', adminController.bulkUpdatePredictions); // Bulk operations
router.patch('/predictions/:id/approve', adminController.approvePrediction);
router.patch('/predictions/:id/reject', adminController.rejectPrediction);
router.patch('/predictions/:id/resolve', adminController.resolvePrediction);

// — Enhanced Financial Operations Dashboard —
router.get('/financial/search', adminController.searchFinancialData);
router.get('/financial/analytics', adminController.getFinancialAnalytics);
router.post('/financial/bulk', adminController.bulkFinancialOperation);
router.get('/financial/export', adminController.exportFinancialData);

// — Legacy Bet & Transaction Oversight (deprecated) —
router.get('/bets', adminController.getBets);
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
router.post('/leaderboard/refresh', adminController.refreshLeaderboard);
router.get('/stats/:userId', adminController.getUserStats);

// — Miscellaneous —
router.post('/aitweet', adminController.triggerAITweet);

export default router;
