// apps/client/src/api/axios.ts
// Rollback: Remove metrics imports and interceptors, restore original axios config
import axios from 'axios';
import { requestManager } from '../lib/requestManager';
import { devMetrics } from '../lib/metrics';
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

// Attach Authorization header if token is set and add request deduplication
api.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // Start timing for dev metrics
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  (config as any).metadata = { ...(config as any).metadata, requestId, startTime: Date.now() };

  devMetrics.startRequest(requestId, config.method?.toUpperCase() || 'GET', config.url || '');

  // CSRF Protection: Bearer tokens in Authorization header provide CSRF protection
  // as they cannot be sent by malicious sites via simple form submissions
  return config;
});

// Add request deduplication interceptor (before response interceptor)
api.interceptors.request.use(
  (config) => {
    // Skip deduplication for non-GET requests to avoid side effects
    if (config.method?.toLowerCase() !== 'get') {
      return config;
    }

    // Mark this request for potential deduplication
    (config as any).metadata = { ...(config as any).metadata, shouldDedupe: true };
    return config;
  },
  (error) => Promise.reject(error),
);

// Create deduplicated version of axios instance with AbortController support
// Rollback: Remove AbortController integration and revert to original axios methods
const originalGet = api.get.bind(api);
api.get = function (url, config = {}) {
  return requestManager.dedupe('get', url, () => originalGet(url, config), config.params);
};

// Helper to create requests with AbortController support
export const createAbortableRequest = () => {
  const controller = new AbortController();

  const request = {
    get: (url: string, config: any = {}) => api.get(url, { ...config, signal: controller.signal }),
    post: (url: string, data?: any, config: any = {}) =>
      api.post(url, data, { ...config, signal: controller.signal }),
    put: (url: string, data?: any, config: any = {}) =>
      api.put(url, data, { ...config, signal: controller.signal }),
    delete: (url: string, config: any = {}) =>
      api.delete(url, { ...config, signal: controller.signal }),
    abort: () => controller.abort(),
  };

  return request;
};

// Handle 401 responses and automatically refresh tokens
api.interceptors.response.use(
  (response) => {
    // End timing for dev metrics
    if ((response.config as any).metadata) {
      const { requestId } = (response.config as any).metadata;
      devMetrics.endRequest(
        requestId,
        response.config.method?.toUpperCase() || 'GET',
        response.config.url || '',
        response.status,
      );
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is not 401 or request has already been retried, reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      // End timing for dev metrics even on error
      if (error.config?.metadata) {
        const { requestId } = error.config.metadata;
        devMetrics.endRequest(
          requestId,
          error.config.method?.toUpperCase() || 'GET',
          error.config.url || '',
          error.response?.status,
        );
      }
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

      // End timing for dev metrics on refresh failure
      if (originalRequest?.metadata) {
        const { requestId } = originalRequest.metadata;
        devMetrics.endRequest(
          requestId,
          originalRequest.method?.toUpperCase() || 'GET',
          originalRequest.url || '',
          401,
        );
      }

      // Call the auth failure callback if it exists (clears auth context)
      if (authFailureCallback) {
        authFailureCallback();
      }

      // Only redirect if we're not already on auth or public pages
      const currentPath = window.location.pathname;
      if (
        !currentPath.includes('/login') &&
        !currentPath.includes('/register') &&
        !currentPath.includes('/public')
      ) {
        console.log('Session expired, redirecting to public home');
        window.location.href = '/public';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// Event System Metrics API functions
export const eventSystemMetricsApi = {
  getMetrics: () => api.get('/api/monitoring/metrics/events'),
  resetMetrics: () => api.post('/api/monitoring/metrics/events/reset'),
  startMonitoring: () => api.post('/api/monitoring/monitoring/start'),
  stopMonitoring: () => api.post('/api/monitoring/monitoring/stop'),
};

export default api;
