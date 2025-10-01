/**
 * Authentication Request DTOs
 *
 * Request payloads for authentication endpoints
 */

// ============================================================================
// Registration
// ============================================================================

export interface RegisterRequest {
  name?: string;
  email?: string;
  password?: string;
}

// ============================================================================
// Login
// ============================================================================

export interface LoginRequest {
  email?: string;
  password?: string;
}

// ============================================================================
// Password Reset
// ============================================================================

export interface PasswordResetRequestRequest {
  email?: string;
}

export interface PasswordResetRequest {
  token?: string;
  newPassword?: string;
}
