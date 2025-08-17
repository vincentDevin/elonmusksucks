// Public Shame Wall Routes
// Read-only endpoints for viewing banned users and shame achievements

import { Router } from 'express';
import * as shameWallController from '../controllers/shameWall.controller';

const router = Router();

// Public endpoints (no auth required)
router.get('/', shameWallController.getShameWall);
router.get('/stats', shameWallController.getShameWallStats);

export default router;
