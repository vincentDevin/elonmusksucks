// Rollback: Delete this file and restore individual hook usage in Dashboard.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/axios';

interface UserDataState {
  stats: any | null;
  achievements: any[] | null;
  activities: any[] | null;
  balance: number | null;
  loading: boolean;
  error: string | null;
}

interface UserDataContextType extends UserDataState {
  refreshUserData: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [state, setState] = useState<UserDataState>({
    stats: null,
    achievements: null,
    activities: null,
    balance: null,
    loading: false,
    error: null,
  });

  const refreshUserData = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      setState((prev) => ({
        ...prev,
        stats: null,
        achievements: null,
        activities: null,
        balance: null,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [statsRes, achievementsRes, activitiesRes] = await Promise.all([
        api.get(`/api/users/${user.id}/stats`),
        api.get(`/api/users/${user.id}/achievements`),
        api.get(`/api/users/${user.id}/activities?limit=20`),
      ]);

      setState((prev) => ({
        ...prev,
        stats: statsRes.data,
        achievements: achievementsRes.data,
        activities: activitiesRes.data,
        balance: statsRes.data?.balance || 0,
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load user data',
      }));
    }
  }, [user?.id, isAuthenticated]);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  return (
    <UserDataContext.Provider
      value={{
        ...state,
        refreshUserData,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};

export default UserDataContext;
