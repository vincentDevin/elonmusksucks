import type { RequestHandler } from 'express';
import {
  createUser,
  validateUser,
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  getUserById,
} from '../services/auth.service';
import { generateAccessToken, generateRefreshToken } from '../utils/jwtHelpers';

export const registerUser: RequestHandler = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const user = await createUser(name, email, password);
    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (err: any) {
    if (err.message === 'EMAIL_IN_USE') {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }
    next(err);
  }
};

export const loginUser: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await validateUser(email, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken);
    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ accessToken });
  } catch (err) {
    next(err);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    // Grab the user ID that your auth middleware attached:
    const userId = (req as any).user?.id ?? (req as any).userId;
    if (!userId) {
      res.status(500).json({ error: 'User context not found' });
      return;
    }

    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Send sanitized user object
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      muskBucks: user.muskBucks,
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const refreshToken: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken as string;
    if (!token) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }
    const payload = require('jsonwebtoken').verify(
      token,
      process.env.REFRESH_TOKEN_SECRET as string,
    ) as { userId: number };
    const stored = await getRefreshToken(token);
    if (!stored) {
      res.status(403).json({ error: 'Invalid refresh token' });
      return;
    }
    const user = await getUserById(payload.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const newAccessToken = generateAccessToken(user);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

export const logoutUser: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken as string;
    if (token) {
      await deleteRefreshToken(token);
      res.clearCookie('refreshToken');
    }
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};
