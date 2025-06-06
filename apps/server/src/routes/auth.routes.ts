// apps/server/src/routes/auth.routes.ts
import { Router } from 'express';
import { registerUser, loginUser, refreshToken, logoutUser } from '../controllers/auth.controller';

const router = Router();
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);

export default router;
