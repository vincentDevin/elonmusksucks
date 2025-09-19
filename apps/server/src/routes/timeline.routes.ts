// apps/server/src/routes/timeline.routes.ts
import { Router } from 'express';
import {
  getArticles,
  getTimelineTweets,
  getArticleDetails,
  toggleArticleReaction,
  getArticleReactions,
  createArticleComment,
  getArticleComments,
} from '../controllers/timeline.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// GET /api/timeline/articles - Basic article listing
router.get('/articles', getArticles);
// GET /api/timeline/tweets
// Query params: cursor (tweet snowflake ID), limit (max 100)
router.get('/tweets', getTimelineTweets);

// GET /api/articles/:id
router.get('/articles/:id', getArticleDetails);

// ===============================================
// Article Reactions API
// ===============================================

// POST /api/timeline/articles/:id/react - Toggle article reaction
router.post('/articles/:id/react', requireAuth, toggleArticleReaction);

// GET /api/timeline/articles/:id/reactions - Get article reactions
router.get('/articles/:id/reactions', getArticleReactions);

// ===============================================
// Article Comments API
// ===============================================

// POST /api/timeline/articles/:id/comments - Add comment
router.post('/articles/:id/comments', requireAuth, createArticleComment);

// GET /api/timeline/articles/:id/comments - Get article comments
router.get('/articles/:id/comments', getArticleComments);

export default router;
