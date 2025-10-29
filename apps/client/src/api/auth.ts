import api, { setAccessToken } from './axios';
import type {
  RegisterPayload,
  LoginPayload,
  PasswordResetPayload,
  AuthUserView,
  UserBalanceView,
} from '@ems/types';

// Type alias for backwards compatibility
export type User = AuthUserView;

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Authentication Module - Security Documentation
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * TOKEN STORAGE SECURITY:
 *
 * 1. Access Tokens (Short-lived, ~15 minutes):
 *    - Stored in MEMORY ONLY (apps/client/src/api/axios.ts)
 *    - Never persisted to localStorage, sessionStorage, or cookies
 *    - Lost on page refresh (must be refreshed via refresh token)
 *    - Sent in Authorization header: "Bearer <token>"
 *    - Benefits:
 *      ✓ XSS-resistant (not in localStorage)
 *      ✓ CSRF-resistant (Bearer token in header, not cookie)
 *      ✓ Limited exposure window (short TTL)
 *
 * 2. Refresh Tokens (Long-lived, ~7 days):
 *    - Stored in HTTP-ONLY COOKIES by server
 *    - Cannot be accessed by JavaScript (XSS protection)
 *    - Automatically included in requests to /api/auth/refresh
 *    - Server MUST set these cookie flags:
 *      ✓ httpOnly: true       - Cannot be accessed by JavaScript
 *      ✓ secure: true         - Only sent over HTTPS in production
 *      ✓ sameSite: 'strict'   - CSRF protection
 *      ✓ path: '/api/auth'    - Only sent to auth endpoints
 *      ✓ maxAge: 7 days       - Expires after 7 days
 *
 * AUTHENTICATION FLOW:
 *
 * 1. User logs in:
 *    POST /api/auth/login { email, password }
 *    ← Response: { data: { accessToken } } + Set-Cookie: refreshToken (HTTP-only)
 *
 * 2. Client stores access token in memory:
 *    setAccessToken(accessToken)
 *
 * 3. Client makes authenticated requests:
 *    GET /api/predictions
 *    → Authorization: Bearer <accessToken>
 *
 * 4. Access token expires (401):
 *    Axios interceptor automatically calls:
 *    POST /api/auth/refresh (refresh token sent automatically via cookie)
 *    ← Response: { accessToken } (new access token)
 *
 * 5. Client stores new access token in memory and retries request:
 *    setAccessToken(newAccessToken)
 *
 * 6. User logs out:
 *    POST /api/auth/logout
 *    ← Server clears refresh token cookie
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * SECURITY BENEFITS:
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ XSS Protection:
 *   - Access tokens in memory (not localStorage)
 *   - Refresh tokens in HTTP-only cookies (not accessible to JavaScript)
 *   - Even if XSS occurs, attacker cannot steal tokens
 *
 * ✓ CSRF Protection:
 *   - Bearer tokens in Authorization header (not cookies)
 *   - Malicious sites cannot forge requests (cannot set Authorization header)
 *   - Refresh token uses sameSite cookie flag
 *
 * ✓ Token Rotation:
 *   - Access tokens short-lived (15 minutes)
 *   - Refresh tokens rotated on each use
 *   - Stolen tokens have limited lifetime
 *
 * ✓ Secure Logout:
 *   - Server invalidates refresh token
 *   - Client clears access token from memory
 *   - No lingering authentication state
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Register a new user. Returns a simple message; no user object is returned.
 */
export async function register(data: RegisterPayload): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>('/api/auth/register', data);
  return res.data;
}

/**
 * Log in an existing user. Sets the HTTP‐only refresh cookie and returns
 * the new access token.
 */
export async function login(data: LoginPayload): Promise<string> {
  const res = await api.post<{ data: { accessToken: string } }>('/api/auth/login', data);
  const { accessToken } = res.data.data;
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

/**
 * Fetch the currently authenticated user's profile.
 */
export async function me(): Promise<AuthUserView> {
  const res = await api.get<AuthUserView>('/api/auth/me');
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

/**
 * Actually perform the password reset.
 */
export async function performPasswordReset(
  data: PasswordResetPayload,
): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>('/api/auth/reset-password', data);
  return res.data;
}

/**
 * Update user's theme preference
 */
export async function updateTheme(themeId: string): Promise<{ success: boolean; theme: string }> {
  const res = await api.put<{ success: boolean; theme: string }>('/api/auth/theme', { themeId });
  return res.data;
}

/**
 * Fetch only the user's current balance without affecting auth state
 */
export async function getBalance(): Promise<UserBalanceView> {
  const res = await api.get<UserBalanceView>('/api/auth/balance');
  return res.data;
}
