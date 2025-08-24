// apps/client/src/api/axios.ts
import axios from 'axios';
// CSRF Note: SPA uses JWT Bearer tokens for authentication, providing equivalent CSRF protection

const api = axios.create({
  baseURL: '', // ← purely relative
  withCredentials: true, // ← still send cookies along
  headers: { 'Content-Type': 'application/json' },
});

// In‐memory access token – updated on login/refresh
let accessToken = '';
export function setAccessToken(token: string) {
  accessToken = token;
}

// Callback for when authentication fails completely
let authFailureCallback: (() => void) | null = null;
export function setAuthFailureCallback(callback: (() => void) | null) {
  authFailureCallback = callback;
}

// Callback for when token is successfully refreshed
let tokenRefreshCallback: ((token: string) => void) | null = null;
export function setTokenRefreshCallback(callback: ((token: string) => void) | null) {
  tokenRefreshCallback = callback;
}

// Track if we're currently refreshing to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Attach Authorization header if token is set
api.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // CSRF Protection: Bearer tokens in Authorization header provide CSRF protection
  // as they cannot be sent by malicious sites via simple form submissions
  return config;
});

// Handle 401 responses and automatically refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is not 401 or request has already been retried, reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If we're currently refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Attempt to refresh the token
      const response = await api.post('/api/auth/refresh');
      const { accessToken: newToken } = response.data;

      // Update the token
      setAccessToken(newToken);

      // Notify AuthContext about the new token
      if (tokenRefreshCallback) {
        tokenRefreshCallback(newToken);
      }

      // Process the queue with the new token
      processQueue(null, newToken);

      // Retry the original request with the new token
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed, clear token and handle auth failure
      processQueue(refreshError, null);
      setAccessToken('');

      // Call the auth failure callback if it exists (clears auth context)
      if (authFailureCallback) {
        authFailureCallback();
      }

      // Only redirect if we're not already on auth pages
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        console.log('Session expired, redirecting to login');
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
