import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  login as loginApi,
  register as registerApi,
  refresh as refreshApi,
  logout as logoutApi,
} from '../api/auth';
import type { ReactNode } from 'react';
import { setAccessToken } from '../api/axios';

interface AuthContextType {
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setToken] = useState<string | null>(null);

  // attempt token refresh on mount
  useEffect(() => {
    refreshApi()
      .then((token) => {
        setToken(token);
        setAccessToken(token);
      })
      .catch(() => {
        setToken(null);
        setAccessToken('');
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const token = await loginApi({ email, password });
    setToken(token);
    setAccessToken(token);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await registerApi({ name, email, password });
      // optionally auto-login after register:
      const token = await loginApi({ email, password });
      setToken(token);
      setAccessToken(token);
    },
    []
  );

  const logout = useCallback(async () => {
    await logoutApi();
    setToken(null);
    setAccessToken('');
  }, []);

  return (
    <AuthContext.Provider value={{ accessToken, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;