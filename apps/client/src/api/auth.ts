import api, { setAccessToken } from './axios';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}
/**
 * Register a new user. Returns a simple message; no user object is returned.
 */
export async function register(data: RegisterPayload): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>('/api/auth/register', data);
  return res.data;
}

export interface LoginPayload {
  email: string;
  password: string;
}
/**
 * Log in an existing user. Sets the HTTP‐only refresh cookie and returns
 * the new access token.
 */
export async function login(data: LoginPayload): Promise<string> {
  const res = await api.post<{ accessToken: string }>('/api/auth/login', data);
  const { accessToken } = res.data;
  setAccessToken(accessToken);
  return accessToken;
}

/**
 * Call the refresh endpoint to get a new access token.
 * The refresh token is sent automatically via cookie.
 */
export async function refresh(): Promise<string> {
  const res = await api.post<{ accessToken: string }>('/api/auth/refresh');
  const { accessToken } = res.data;
  setAccessToken(accessToken);
  return accessToken;
}

/**
 * Log out the current user (clears the server‐side refresh token & client cookie).
 */
export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
  setAccessToken('');
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  muskBucks: number;
  profileComplete: boolean;
}

/**
 * Fetch the currently authenticated user’s profile.
 */
export async function me(): Promise<User> {
  const res = await api.get<User>('/api/auth/me');
  return res.data;
}

/**
 * Verify an email confirmation token. The backend will redirect the browser,
 * but we also return the JSON `{ message }` if someone calls this endpoint directly.
 */
export async function verifyEmail(token: string): Promise<{ message?: string }> {
  const res = await api.get<{ message?: string }>(
    `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
  );
  return res.data;
}

/**
 * Request a password reset email. Always returns `{ message }` to avoid enumeration.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>('/api/auth/request-password-reset', { email });
  return res.data;
}

export interface PasswordResetPayload {
  token: string;
  newPassword: string;
}
/**
 * Actually perform the password reset.
 */
export async function performPasswordReset(
  data: PasswordResetPayload,
): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>('/api/auth/reset-password', data);
  return res.data;
}
