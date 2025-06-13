import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

export const generateAccessToken = (user: User): string => {
  return jwt.sign({ userId: user.id }, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: '15m' });
};

export const generateRefreshToken = (user: User): string => {
  return jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: '7d' });
};
