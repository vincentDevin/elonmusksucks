// apps/server/src/controllers/auth.controller.ts
import type { RequestHandler } from 'express';
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
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwtHelpers';

// Standardize error payloads
function sendError(res: any, status: number, message: string) {
  return res.status(status).json({ error: message });
}

/**
 * POST /api/auth/register
 */
export const registerUser: RequestHandler = async (req, res) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };
  if (!name || !email || !password) {
    return sendError(res, 400, 'Name, email, and password are required');
  }

  try {
    const user = await createUser(name, email, password);
    const verificationToken = await createEmailVerification(user.id);

    // Fire-and-forget email
    void (async () => {
      try {
        const host =
          process.env.SERVER_URL ?? `${req.protocol}://${req.get('host')}`;
        const verifyUrl = `${host}/api/auth/verify-email?token=${verificationToken}`;
        await sendEmail(
          user.email,
          'Please verify your email address',
          `<p>Hi ${user.name},</p>
           <p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`
        );
      } catch (mailErr) {
        console.error('Verification email error:', mailErr);
      }
    })();

    return res
      .status(201)
      .json({ message: 'Registered. Please check your email.' });
  } catch (err: any) {
    console.error('Registration error:', err);
    return sendError(res, 400, 'Registration failed');
  }
};

/**
 * POST /api/auth/login
 */
export const loginUser: RequestHandler = async (req, res, next) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    return sendError(res, 400, 'Email and password required');
  }

  try {
    const user = await validateUser(email, password);
    if (!user) {
      return sendError(res, 401, 'Invalid credentials');
    }
    if (!user.emailVerified) {
      return sendError(res, 403, 'Email not verified');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken);

    return res
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

/**
 * GET /api/auth/me
 */
export const me: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return sendError(res, 401, 'Authentication required');
    }

    const user = await getUserById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      muskBucks: user.muskBucks,
      profileComplete: user.profileComplete,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh-token
 */
export const refreshToken: RequestHandler = async (req, res) => {
  const token = req.cookies.refreshToken as string | undefined;
  if (!token) {
    return sendError(res, 401, 'Refresh token required');
  }

  try {
    const payload = verifyRefreshToken(token);
    const stored = await getRefreshToken(token);
    if (!stored) {
      return sendError(res, 403, 'Invalid refresh token');
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const newAccessToken = generateAccessToken(user);
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return sendError(res, 403, 'Invalid or expired refresh token');
  }
};

/**
 * POST /api/auth/logout
 */
export const logoutUser: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken as string | undefined;
    if (token) {
      await deleteRefreshToken(token);
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
    }
    // note: no `return` here
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/verify-email
 */
export const verifyEmail: RequestHandler = async (req, res) => {
  const token = req.query.token;
  if (typeof token !== 'string') {
    return sendError(res, 400, 'Token required');
  }
  const ok = await verifyEmailToken(token);
  if (!ok) {
    return sendError(res, 400, 'Invalid or expired token');
  }
  const redirectUrl =
    (process.env.CLIENT_URL ?? 'http://localhost:3000') + '/login?verified=true';
  return res.redirect(redirectUrl);
};

/**
 * POST /api/auth/request-password-reset
 */
export const requestPasswordReset: RequestHandler = async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    return sendError(res, 400, 'Email required');
  }
  const normalized = email.trim().toLowerCase();
  const user = await getUserByEmail(normalized);

  if (user) {
    void (async () => {
      try {
        const token = await createPasswordReset(user.id);
        const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
        await sendEmail(
          user.email,
          'Password Reset',
          `<p>Hi ${user.name},</p>
           <p>Click <a href="${url}">here</a> to reset password (1h expiry).</p>`
        );
      } catch (mailErr) {
        console.error('Reset email error:', mailErr);
      }
    })();
  }

  // Always 200 to prevent enumeration
  return res.json({
    message: 'If that email is registered, you’ll receive a reset link.',
  });
};

/**
 * POST /api/auth/reset-password
 */
export const performPasswordReset: RequestHandler = async (req, res) => {
  const { token, newPassword } = req.body as {
    token?: string;
    newPassword?: string;
  };
  if (typeof token !== 'string' || typeof newPassword !== 'string') {
    return sendError(res, 400, 'Token and newPassword required');
  }
  const ok = await resetPassword(token, newPassword);
  if (!ok) {
    return sendError(res, 400, 'Invalid or expired token');
  }
  return res.json({ message: 'Password has been reset. You may now log in.' });
};
