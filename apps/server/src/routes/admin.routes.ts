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

// — Bet & Transaction Oversight —
router.get('/bets', adminController.getBets);
router.patch('/bets/:id/refund', adminController.refundBet);
router.get('/transactions', adminController.getTransactions);

// — Badge & Content Moderation —
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
