import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import {
  login as loginApi,
  register as registerApi,
  refresh as refreshApi,
  logout as logoutApi,
  me,
} from '../api/auth';
import type { User } from '../api/auth';
import type { ReactNode } from 'react';
import { setAccessToken } from '../api/axios';

interface AuthContextType {
  accessToken: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // attempt token refresh on mount
  useEffect(() => {
    refreshApi()
      .then(async (token) => {
        setToken(token);
        setAccessToken(token);
        const currentUser = await me();
        setUser(currentUser);
      })
      .catch(() => {
        setToken(null);
        setAccessToken('');
        setUser(null);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const token = await loginApi({ email, password });
    setToken(token);
    setAccessToken(token);
    const currentUser = await me();
    setUser(currentUser);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await registerApi({ name, email, password });
    // optionally auto-login after register:
    const token = await loginApi({ email, password });
    setToken(token);
    setAccessToken(token);
    const currentUser = await me();
    setUser(currentUser);
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setToken(null);
    setAccessToken('');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ accessToken, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/** Hook to access auth context */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
