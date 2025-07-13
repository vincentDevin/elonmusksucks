// apps/client/src/components/admin/BetsTransactions.tsx
import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { useSocket } from '../../contexts/SocketContext';
import * as adminApi from '../../api/admin';
import type { AdminBet, AdminTransaction } from '@ems/types';

export default function BetsTransactions() {
  const { bets: rawBets, transactions: rawTransactions } = useAdmin();
  const socket = useSocket();

  const [bets, setBets] = useState<AdminBet[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);
  const [refundingId, setRefundingId] = useState<number | null>(null);

  // Reload bets from context or API
  const loadBets = useCallback(async () => {
    setLoadingBets(true);
    try {
      // if your context already keeps them up to date, you can just do:
      // setBets(rawBets as AdminBet[])
      // but we'll re-fetch from API to be safe:
      const fresh = await adminApi.listBets();
      setBets(fresh as AdminBet[]);
    } finally {
      setLoadingBets(false);
    }
  }, []);

  // Reload transactions
  const loadTx = useCallback(async () => {
    setLoadingTx(true);
    try {
      const fresh = await adminApi.listTransactions();
      setTransactions(fresh as AdminTransaction[]);
    } finally {
      setLoadingTx(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadBets();
    loadTx();
  }, [loadBets, loadTx]);

  // Keep in sync if context raw changes (e.g. after manual API calls)
  useEffect(() => {
    setBets(rawBets as AdminBet[]);
  }, [rawBets]);
  useEffect(() => {
    setTransactions(rawTransactions as AdminTransaction[]);
  }, [rawTransactions]);

  // Listen for real-time events
  useEffect(() => {
    socket.on('betPlaced', loadBets);
    socket.on('parlayPlaced', loadBets);
    socket.on('transactionCreated', loadTx);
    return () => {
      socket.off('betPlaced', loadBets);
      socket.off('parlayPlaced', loadBets);
      socket.off('transactionCreated', loadTx);
    };
  }, [socket, loadBets, loadTx]);

  // Refund handler with loading state
  const handleRefund = async (betId: number) => {
    setRefundingId(betId);
    try {
      await adminApi.refundBet(betId);
      // bump both lists
      await loadBets();
      await loadTx();
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <section className="space-y-8">
      <h2 className="text-xl font-semibold mb-4">Bets & Transactions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Bets */}
        <div>
          <h3 className="font-semibold mb-2">Bets</h3>
          {loadingBets ? (
            <p className="italic text-center">Loading bets…</p>
          ) : (
            <ul className="space-y-2">
              {bets.length ? (
                bets.map((b) => (
                  <li key={b.id} className="flex justify-between items-center border-b py-2">
                    <div>
                      <span className="font-medium">{b.userName}</span> wagered{' '}
                      <span className="font-semibold">{b.amount}</span> on{' '}
                      <span className="italic">{b.prediction.title}</span>
                    </div>
                    <button
                      onClick={() => handleRefund(b.id)}
                      disabled={refundingId === b.id}
                      className={`px-3 py-1 rounded transition ${
                        refundingId === b.id
                          ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                          : 'bg-yellow-500 text-surface hover:opacity-90'
                      }`}
                    >
                      {refundingId === b.id ? 'Refunding…' : 'Refund'}
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-tertiary italic">No bets to display.</li>
              )}
            </ul>
          )}
        </div>

        {/* Transactions */}
        <div>
          <h3 className="font-semibold mb-2">Transactions</h3>
          {loadingTx ? (
            <p className="italic text-center">Loading transactions…</p>
          ) : (
            <ul className="space-y-2">
              {transactions.length ? (
                transactions.map((t) => (
                  <li key={t.id} className="flex justify-between items-center border-b py-2">
                    <span>
                      <span className="font-medium">{t.userName}</span> {t.type.toLowerCase()} of{' '}
                      <span className="font-semibold">{t.amount}</span> (balance:{' '}
                      <span className="font-semibold">{t.balanceAfter}</span>)
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-tertiary italic">No transactions to display.</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
