import api, { setAccessToken } from './axios';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}
export async function register(data: RegisterPayload) {
  const res = await api.post('/api/auth/register', data);
  return res.data; // { id, name, email }
}

export interface LoginPayload {
  email: string;
  password: string;
}
export async function login(data: LoginPayload) {
  const res = await api.post('/api/auth/login', data);
  const { accessToken } = res.data;
  setAccessToken(accessToken);
  return accessToken;
}

export async function refresh() {
  const res = await api.post('/api/auth/refresh');
  const { accessToken } = res.data;
  setAccessToken(accessToken);
  return accessToken;
}

export async function logout() {
  await api.post('/api/auth/logout');
  setAccessToken('');
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  muskBucks: number;
}

/** Fetch the currently authenticated user’s profile */
export async function me(): Promise<User> {
  const res = await api.get<User>('/api/auth/me');
  return res.data;
}
