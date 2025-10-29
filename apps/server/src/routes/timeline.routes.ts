// apps/server/src/routes/timeline.routes.ts
import { Router } from 'express';
import {
  getTimeline,
  getArticles,
  getArticleDetails,
  toggleArticleReaction,
  getArticleReactions,
  createArticleComment,
  getArticleComments,
  searchTimeline,
  getSearchSuggestions,
  getTrendingContent,
  checkArticleBookmark,
  checkArticleBookmarksBulk,
  toggleArticleBookmark,
  getUserBookmarks,
  getBookmarkCollections,
  createBookmarkCollection,
  shareArticle,
  getArticleShareStats,
} from '../controllers/timeline.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// GET /api/timeline - Unified timeline (posts + articles)
// Query params: limit, cursor, type (all/articles/posts)
router.get('/', getTimeline);

// GET /api/timeline/articles - Articles only (for public site)
// Query params: limit, cursor
router.get('/articles', getArticles);

// GET /api/timeline/articles/:id - Article details
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

// ===============================================
// Search and Discovery API
// ===============================================

// GET /api/timeline/search - Search timeline content
// Query params: q (query string), filters (JSON), limit, cursor
router.get('/search', searchTimeline);

// GET /api/timeline/search/suggestions - Get search suggestions
// Query params: q (partial query string)
router.get('/search/suggestions', getSearchSuggestions);

// GET /api/timeline/trending - Get trending content
// Query params: timeRange (hour|day|week|month), limit, type (articles|posts|all)
router.get('/trending', getTrendingContent);

// ===============================================
// Bookmark System API
// ===============================================

// GET /api/timeline/bookmarks/check/:id - Check if article is bookmarked
router.get('/bookmarks/check/:id', requireAuth, checkArticleBookmark);

// POST /api/timeline/bookmarks/check-bulk - Check multiple bookmarks at once
router.post('/bookmarks/check-bulk', requireAuth, checkArticleBookmarksBulk);

// POST /api/timeline/articles/:id/bookmark - Bookmark article
router.post('/articles/:id/bookmark', requireAuth, toggleArticleBookmark);

// GET /api/timeline/bookmarks - Get user's bookmarks
router.get('/bookmarks', requireAuth, getUserBookmarks);

// GET /api/timeline/bookmark-collections - Get bookmark collections
router.get('/bookmark-collections', requireAuth, getBookmarkCollections);

// POST /api/timeline/bookmark-collections - Create bookmark collection
router.post('/bookmark-collections', requireAuth, createBookmarkCollection);

// ===============================================
// Social Sharing API (Articles)
// ===============================================

// POST /api/timeline/articles/:id/share - Share article
router.post('/articles/:id/share', requireAuth, shareArticle);

// GET /api/timeline/articles/:id/share-stats - Get article share statistics
router.get('/articles/:id/share-stats', getArticleShareStats);

export default router;
