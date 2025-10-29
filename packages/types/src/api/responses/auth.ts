/**
 * Authentication Response DTOs
 *
 * Response types for authentication endpoints
 */

// ============================================================================
// Auth User View
// ============================================================================

export interface AuthUserView {
  id: number;
  name: string;
  email: string;
  role: string;
  muskBucks: string; // BigInt → string
  profileComplete: boolean;
  avatarUrl: string | null;
  theme: string;
  createdAt: string; // Date → ISO string
  updatedAt: string; // Date → ISO string
}

// ============================================================================
// User Balance View
// ============================================================================

export interface UserBalanceView {
  muskBucks: string; // BigInt → string
}

// ============================================================================
// Auth Response (with tokens)
// ============================================================================

export interface AuthResponse {
  user: AuthUserView;
  accessToken: string;
  refreshToken: string;
}
