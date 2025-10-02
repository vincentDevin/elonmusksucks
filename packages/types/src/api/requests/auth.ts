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

// Alias for backwards compatibility
export type RegisterPayload = RegisterRequest;

// ============================================================================
// Login
// ============================================================================

export interface LoginRequest {
  email?: string;
  password?: string;
}

// Alias for backwards compatibility
export type LoginPayload = LoginRequest;

// ============================================================================
// Password Reset
// ============================================================================

export interface PasswordResetRequestRequest {
  email?: string;
}

// Alias for backwards compatibility
export type PasswordResetRequestPayload = PasswordResetRequestRequest;

export interface PasswordResetRequest {
  token?: string;
  newPassword?: string;
}

// Alias for backwards compatibility
export type PasswordResetPayload = PasswordResetRequest;
