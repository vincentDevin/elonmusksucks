import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// User management
router.get('/users', adminController.getUsers);
router.patch('/users/\:id/role', adminController.updateUserRole);
router.patch('/users/\:id/activate', adminController.activateUser);
router.patch('/users/\:id/balance', adminController.updateUserBalance);

// Prediction management
router.get('/predictions', adminController.getPredictions);
router.patch('/predictions/\:id/approve', adminController.approvePrediction);
router.patch('/predictions/\:id/reject', adminController.rejectPrediction);
router.patch('/predictions/\:id/resolve', adminController.resolvePrediction);

// Bet & Transaction oversight
router.get('/bets', adminController.getBets);
router.patch('/bets/\:id/refund', adminController.refundBet);
router.get('/transactions', adminController.getTransactions);

// Badge & Content Moderation
router.get('/posts', adminController.getPosts);
router.delete('/posts/\:id', adminController.deletePost);
router.get('/badges', adminController.getBadges);
router.post('/badges', adminController.createBadge);
router.patch('/users/\:id/badges', adminController.assignBadge);
router.delete('/users/\:id/badges/\:badgeId', adminController.revokeBadge);

// Leaderboard & Stats
router.post('/leaderboard/refresh', adminController.refreshLeaderboard);
router.get('/stats/\:userId', adminController.getUserStats);

// Miscellaneous (placeholders)
router.post('/aitweet', adminController.triggerAITweet);

export default router;
