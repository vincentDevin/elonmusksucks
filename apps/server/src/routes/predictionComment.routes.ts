// apps/server/src/routes/predictionComment.routes.ts
import { Router } from 'express';
import {
  createComment,
  updateComment,
  deleteComment,
  getComments,
  getReplies,
  toggleCommentLike,
  getUserComments,
} from '../controllers/predictionComment.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Prediction comment routes
// GET /api/predictions/:id/comments - Get comments for a prediction (public)
router.get('/:id/comments', getComments);

// POST /api/predictions/:id/comments - Create a comment on a prediction (auth required)
router.post('/:id/comments', requireAuth, createComment);

// Comment management routes (using separate path structure)
// PUT /api/comments/:commentId - Update a comment (auth required)
router.put('/comments/:commentId', requireAuth, updateComment);

// DELETE /api/comments/:commentId - Delete a comment (auth required)
router.delete('/comments/:commentId', requireAuth, deleteComment);

// GET /api/comments/:commentId/replies - Get replies for a comment (public)
router.get('/comments/:commentId/replies', getReplies);

// POST /api/comments/:commentId/like - Toggle like on a comment (auth required)
router.post('/comments/:commentId/like', requireAuth, toggleCommentLike);

// User comment routes
// GET /api/users/:userId/comments - Get user's recent comments (public)
router.get('/users/:userId/comments', getUserComments);

export default router;
