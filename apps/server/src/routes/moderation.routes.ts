// apps/server/src/routes/moderation.routes.ts
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import * as moderationController from '../controllers/moderation.controller';

const router = Router();

// All moderation routes require authentication and admin privileges
router.use(requireAuth);
router.use(requireAdmin);

// User moderation
router.post('/ban', moderationController.banUser);
router.delete('/ban/:userId', moderationController.unbanUser);
router.post('/mute', moderationController.muteUser);
router.post('/kick', moderationController.kickUser);

// Content moderation
router.delete('/message/:messageId', moderationController.deleteMessage);
router.delete('/post/:postId', moderationController.deletePost);

// Information endpoints
router.get('/bans', moderationController.getActiveBans);
router.get('/bans/:userId', moderationController.getUserBanStatus);
router.get('/history', moderationController.getModerationHistory);
router.get('/actions/recent', moderationController.getRecentModerationActions);

export default router;