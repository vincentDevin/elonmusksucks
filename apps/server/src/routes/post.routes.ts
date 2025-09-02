import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as postController from '../controllers/post.controller';

const router = Router();

// Public timeline (authentication optional for viewing)
router.get('/', postController.getTimeline);
router.get('/trending', postController.getTrendingPosts);

// Single post operations
router.get('/:id', postController.getPost);
router.get('/:id/comments', postController.getPostComments);

// Public reaction endpoints (no auth required for viewing)
router.get('/:id/reactions', postController.getPostReactions);
router.get('/:id/reactions/counts', postController.getReactionCounts);

// Protected routes - require authentication
router.use(requireAuth);

// Create post
router.post('/', postController.createPost);

// Update/delete post
router.patch('/:id', postController.updatePost);
router.delete('/:id', postController.deletePost);

// Comments
router.post('/:id/comments', postController.createComment);

// Reactions (require authentication)
router.post('/:id/reactions', postController.toggleReaction);
router.delete('/:id/reactions/:type', postController.removeReaction);

export default router;
