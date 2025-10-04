// apps/server/src/routes/unified-content.routes.ts
import { Router } from 'express';
import { UnifiedContentController } from '../controllers/unified-content.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { eventBus } from '../lib/EventBus';
import { PrismaClient } from '@prisma/client';

/**
 * Unified Content Routes
 *
 * Admin-only routes for unified content management.
 * All routes require authentication and admin role.
 */
const prisma = new PrismaClient();
const router = Router();
const controller = new UnifiedContentController(eventBus, prisma);

// All routes require authentication and admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/unified-content
 * List unified content with filters and pagination
 */
router.get('/', (req, res) => controller.getContent(req, res));

/**
 * GET /api/admin/unified-content/analytics
 * Get unified content analytics
 * Note: Must come before /:id route to avoid route collision
 */
router.get('/analytics', (req, res) => controller.getAnalytics(req, res));

/**
 * GET /api/admin/unified-content/export
 * Export content data
 * Note: Must come before /:id route to avoid route collision
 */
router.get('/export', (req, res) => controller.exportContent(req, res));

/**
 * POST /api/admin/unified-content/bulk
 * Perform bulk moderation operations
 */
router.post('/bulk', (req, res) => controller.bulkModerate(req, res));

/**
 * GET /api/admin/unified-content/:id
 * Get single content item by unified ID
 */
router.get('/:id', (req, res) => controller.getContentById(req, res));

/**
 * POST /api/admin/unified-content/:id/approve
 * Approve content item
 */
router.post('/:id/approve', (req, res) => controller.approveContent(req, res));

/**
 * POST /api/admin/unified-content/:id/reject
 * Reject content item
 */
router.post('/:id/reject', (req, res) => controller.rejectContent(req, res));

/**
 * POST /api/admin/unified-content/:id/flag
 * Flag content item for review
 */
router.post('/:id/flag', (req, res) => controller.flagContent(req, res));

/**
 * DELETE /api/admin/unified-content/:id
 * Delete content item
 */
router.delete('/:id', (req, res) => controller.deleteContent(req, res));

/**
 * PATCH /api/admin/unified-content/:id/metadata
 * Update content metadata
 */
router.patch('/:id/metadata', (req, res) => controller.updateMetadata(req, res));

export default router;
