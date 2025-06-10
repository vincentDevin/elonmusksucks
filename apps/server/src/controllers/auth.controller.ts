import type { RequestHandler, NextFunction, Request, Response } from 'express';
import {
  createUser,
  validateUser,
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  getUserById,
  createEmailVerification,
  verifyEmailToken,
  getUserByEmail,
  createPasswordReset,
  resetPassword,
} from '../services/auth.service';
import { sendEmail } from '../services/email.service';
import { generateAccessToken, generateRefreshToken } from '../utils/jwtHelpers';

export const registerUser: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const user = await createUser(name, email, password);
    const verificationToken = await createEmailVerification(user.id);

    // attempt to send the email, but don’t block on failures
    try {
      // Build a direct API verification link so clicking the email updates the database immediately
      const host = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
      const verifyUrl = `${host}/api/auth/verify-email?token=${verificationToken}`;
      await sendEmail(
        user.email,
        'Please verify your email address',
        `<p>Hi ${user.name},</p>
         <p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
      );
      console.log(`Verification email sent to ${user.email}`);
    } catch (mailErr) {
      console.error('Error sending verification email:', mailErr);
    }
    // finally, respond successfully even if email failed
    res.status(201).json({ message: 'Registered! Check your email to verify.' });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(400).json({ error: 'Registration failed' });
  }
};

export const loginUser: RequestHandler = async (req, res, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await validateUser(email, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    if (!user.emailVerified) {
      res.status(403).json({ error: 'Please verify your email before logging in.' });
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
      profileComplete: user.profileComplete,
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

// This handler should be mounted at /api/auth/verify-email
export const verifyEmail: RequestHandler = async (req: Request, res: Response) => {
  const { token } = req.query;
  if (typeof token !== 'string') {
    res.status(400).json({ error: 'Token required' });
    return;
  }
  const ok = await verifyEmailToken(token);
  if (!ok) {
    res.status(400).json({ error: 'Invalid or expired token' });
    return;
  }
  const front = process.env.CLIENT_URL || 'http://localhost:3000';
  return res.redirect(`${front}/login?verified=true`);
};

/**
 * POST /auth/request-password-reset
 * { email }
 */
export const requestPasswordReset: RequestHandler = async (req, res) => {
  const { email } = req.body;
  const normalized = email.trim().toLowerCase();
  const user = await getUserByEmail(normalized);

  // Always respond 200 to avoid user enumeration
  if (user) {
    try {
      const token = await createPasswordReset(user.id);
      const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
      await sendEmail(
        user.email,
        'Your password reset link',
        `<p>Hi ${user.name},</p>
         <p>Click <a href="${url}">here</a> to reset your password. This link expires in 1 hour.</p>`,
      );
      console.log(`Password reset email sent to ${user.email}`);
    } catch (err) {
      console.error('Error sending reset email:', err);
    }
  }

  // Always respond OK
  res.json({ message: 'If that email is registered, you’ll receive a reset link.' });
};

/**
 * POST /auth/reset-password
 * { token, newPassword }
 */
export const performPasswordReset: RequestHandler = async (req, res) => {
  const { token, newPassword } = req.body;
  if (typeof token !== 'string' || typeof newPassword !== 'string') {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const ok = await resetPassword(token, newPassword);
  if (!ok) {
    res.status(400).json({ error: 'Invalid or expired token' });
    return;
  }

  res.json({ message: 'Password has been reset. You can now log in.' });
  return;
};
