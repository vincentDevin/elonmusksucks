// apps/client/src/hooks/useMeStubs.ts
import { useState, useEffect, useCallback } from 'react';
import { SOCKET_EVENTS } from '@ems/types';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../api/axios';

export interface UserBet {
  id: number;
  predictionId: number;
  predictionTitle: string;
  amount: number;
  odds: number;
  optionLabel?: string;
  status: string;
  createdAt: string;
}

export interface UserParlay {
  id: number;
  amount: number;
  combinedOdds: number;
  potentialPayout: number;
  legCount: number;
  status: string;
  createdAt: string;
  legs: Array<{
    predictionTitle: string;
    optionLabel: string;
  }>;
}

export interface UserPrediction {
  id: number;
  title: string;
  category: string;
  type: string;
  approved: boolean;
  resolved: boolean;
  expiresAt: string;
  createdAt: string;
  totalBets?: number;
}

export function useMyBets() {
  const { user } = useAuth();
  const socket = useSocket();
  const [data, setData] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBets = useCallback(async () => {
    if (!user?.id) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<UserBet[]>(`/api/users/${user.id}/bets`);
      setData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch user bets:', err);
      setError(err?.response?.data?.error || 'Failed to load bets');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  // Listen for real-time bet updates
  useEffect(() => {
    if (!user?.id || !socket) return;

    const handleBetPlaced = (betData: any) => {
      // Only refresh if this bet belongs to the current user
      if (betData.user?.id === user.id) {
        fetchBets();
      }
    };

    socket.on(SOCKET_EVENTS.BET_PLACED, handleBetPlaced);

    return () => {
      socket.off(SOCKET_EVENTS.BET_PLACED, handleBetPlaced);
    };
  }, [user?.id, socket, fetchBets]);

  return { data, loading, error, refetch: fetchBets };
}

export function useMyParlays() {
  const { user } = useAuth();
  const socket = useSocket();
  const [data, setData] = useState<UserParlay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParlays = useCallback(async () => {
    if (!user?.id) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<UserParlay[]>(`/api/users/${user.id}/parlays`);
      setData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch user parlays:', err);
      setError(err?.response?.data?.error || 'Failed to load parlays');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchParlays();
  }, [fetchParlays]);

  // Listen for real-time parlay updates
  useEffect(() => {
    if (!user?.id || !socket) return;

    const handleParlayPlaced = (parlayData: any) => {
      // Only refresh if this parlay belongs to the current user
      if (parlayData.user?.id === user.id) {
        fetchParlays();
      }
    };

    socket.on(SOCKET_EVENTS.PARLAY_PLACED, handleParlayPlaced);

    return () => {
      socket.off(SOCKET_EVENTS.PARLAY_PLACED, handleParlayPlaced);
    };
  }, [user?.id, socket, fetchParlays]);

  return { data, loading, error, refetch: fetchParlays };
}

export function useMyPredictions() {
  const { user } = useAuth();
  const socket = useSocket();
  const [data, setData] = useState<UserPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    if (!user?.id) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<UserPrediction[]>(`/api/users/${user.id}/predictions`);
      setData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch user predictions:', err);
      setError(err?.response?.data?.error || 'Failed to load predictions');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  // Listen for real-time prediction updates
  useEffect(() => {
    if (!user?.id || !socket) return;

    const handlePredictionCreated = (predictionData: any) => {
      // Only refresh if this prediction was created by the current user
      if (predictionData.creatorId === user.id) {
        fetchPredictions();
      }
    };

    socket.on(SOCKET_EVENTS.PREDICTION_CREATED, handlePredictionCreated);

    return () => {
      socket.off(SOCKET_EVENTS.PREDICTION_CREATED, handlePredictionCreated);
    };
  }, [user?.id, socket, fetchPredictions]);

  return { data, loading, error, refetch: fetchPredictions };
}
