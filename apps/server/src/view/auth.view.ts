import type { AuthUserView, UserBalanceView } from '@ems/types';

/**
 * Maps authenticated user data to standardized AuthUserView DTO
 * Handles BigInt → string conversion for muskBucks and Date → ISO string
 */
export const toAuthUserView = (user: {
  id: number;
  name: string;
  email: string;
  role: string;
  muskBucks: bigint;
  profileComplete: boolean;
  avatarUrl: string | null;
  theme: string;
  createdAt?: Date;
  updatedAt?: Date;
}): AuthUserView => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  muskBucks: user.muskBucks.toString(),
  profileComplete: user.profileComplete,
  avatarUrl: user.avatarUrl,
  theme: user.theme,
  createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
  updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
});

/**
 * Maps user balance data to standardized UserBalanceView DTO
 * Handles BigInt → string conversion for muskBucks
 */
export const toUserBalanceView = (user: { muskBucks: bigint }): UserBalanceView => ({
  muskBucks: user.muskBucks.toString(),
});
