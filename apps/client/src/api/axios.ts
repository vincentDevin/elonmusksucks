// apps/client/src/api/axios.ts
import axios from 'axios';

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

// Attach Authorization header if token is set
api.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export default api;
