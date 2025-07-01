// apps/client/src/contexts/AdminContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import * as adminApi from '../api/admin';
import type {
  PublicUser,
  PublicPrediction,
  PublicBet,
  PublicTransaction,
  PublicBadge,
  UserStatsDTO,
  Role,
  Outcome,
} from '@ems/types';

interface AdminContextType {
  // state
  users: PublicUser[];
  pendingPredictions: PublicPrediction[];
  bets: PublicBet[];
  transactions: PublicTransaction[];
  badges: PublicBadge[];
  statsFor: Record<number, UserStatsDTO | null>;
  // actions
  loadUsers(): Promise<void>;
  updateUserRole(userId: number, role: Role): Promise<void>;
  activateUser(userId: number, active: boolean): Promise<void>;
  updateUserBalance(userId: number, amount: number): Promise<void>;
  loadPendingPredictions(): Promise<void>;
  loadBets(): Promise<void>;
  loadTransactions(): Promise<void>;
  loadBadges(): Promise<void>;
  loadUserStats(userId: number): Promise<void>;
  approvePrediction(id: number): Promise<void>;
  rejectPrediction(id: number): Promise<void>;
  resolvePrediction(id: number, outcome: Outcome): Promise<void>;
  refundBet(id: number): Promise<void>;
  createBadge(data: { name: string; description?: string; iconUrl?: string }): Promise<void>;
  assignBadge(userId: number, badgeId: number): Promise<void>;
  revokeBadge(userId: number, badgeId: number): Promise<void>;
  refreshLeaderboard(): Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [pendingPredictions, setPendingPredictions] = useState<PublicPrediction[]>([]);
  const [bets, setBets] = useState<PublicBet[]>([]);
  const [transactions, setTransactions] = useState<PublicTransaction[]>([]);
  const [badges, setBadges] = useState<PublicBadge[]>([]);
  const [statsFor, setStatsFor] = useState<Record<number, UserStatsDTO | null>>({});

  const loadUsers = useCallback(async () => {
    const data = await adminApi.listUsers();
    setUsers(data);
  }, []);

  const updateUserRole = useCallback(async (userId: number, role: Role) => {
    const updated = await adminApi.updateUserRole(userId, role);
    setUsers((us) => us.map((u) => (u.id === userId ? updated : u)));
  }, []);

  const activateUser = useCallback(async (userId: number, active: boolean) => {
    const updated = await adminApi.activateUser(userId, active);
    setUsers((us) => us.map((u) => (u.id === userId ? updated : u)));
  }, []);

  const updateUserBalance = useCallback(async (userId: number, amount: number) => {
    const updated = await adminApi.updateUserBalance(userId, amount);
    setUsers((us) => us.map((u) => (u.id === userId ? updated : u)));
  }, []);

  const loadPendingPredictions = useCallback(async () => {
    const all = await adminApi.listPredictions();
    setPendingPredictions(all.filter((p) => !(p as any).approved));
  }, []);

  const approvePrediction = useCallback(async (id: number) => {
    await adminApi.approvePrediction(id);
    setPendingPredictions((ps) => ps.filter((p) => p.id !== id));
  }, []);

  const rejectPrediction = useCallback(async (id: number) => {
    await adminApi.rejectPrediction(id);
    setPendingPredictions((ps) => ps.filter((p) => p.id !== id));
  }, []);

  const resolvePrediction = useCallback(async (id: number, outcome: Outcome) => {
    await adminApi.resolvePrediction(id, outcome);
    setPendingPredictions((ps) => ps.filter((p) => p.id !== id));
  }, []);

  const loadBets = useCallback(async () => {
    const data = await adminApi.listBets();
    setBets(data);
  }, []);

  const refundBet = useCallback(async (id: number) => {
    await adminApi.refundBet(id);
    setBets((bs) => bs.map((b) => (b.id === id ? { ...b, status: 'REFUNDED' } : b)));
  }, []);

  const loadTransactions = useCallback(async () => {
    const data = await adminApi.listTransactions();
    setTransactions(data);
  }, []);

  const loadBadges = useCallback(async () => {
    const data = await adminApi.listBadges();
    setBadges(data);
  }, []);

  const createBadge = useCallback(
    async (data: { name: string; description?: string; iconUrl?: string }) => {
      const b = await adminApi.createBadge(data);
      setBadges((bs) => [...bs, b]);
    },
    [],
  );

  const assignBadge = useCallback(async (userId: number, badgeId: number) => {
    await adminApi.assignBadge(userId, badgeId);
  }, []);

  const revokeBadge = useCallback(async (userId: number, badgeId: number) => {
    await adminApi.revokeBadge(userId, badgeId);
  }, []);

  const loadUserStats = useCallback(async (userId: number) => {
    const s = await adminApi.getUserStats(userId);
    setStatsFor((prev) => ({ ...prev, [userId]: s }));
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    await adminApi.refreshLeaderboard();
  }, []);

  return (
    <AdminContext.Provider
      value={{
        users,
        pendingPredictions,
        bets,
        transactions,
        badges,
        statsFor,
        loadUsers,
        updateUserRole,
        activateUser,
        updateUserBalance,
        loadPendingPredictions,
        loadBets,
        loadTransactions,
        loadBadges,
        loadUserStats,
        approvePrediction,
        rejectPrediction,
        resolvePrediction,
        refundBet,
        createBadge,
        assignBadge,
        revokeBadge,
        refreshLeaderboard,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
