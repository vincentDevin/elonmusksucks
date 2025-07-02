import React from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import type { AdminBet, AdminTransaction } from '@ems/types';

const BetsTransactions: React.FC = () => {
  const {
    bets: rawBets,
    transactions: rawTransactions,
    refundBet,
  } = useAdmin();

  // Cast to the admin‐extended types so TS knows about userName & prediction
  const bets = rawBets as AdminBet[];
  const transactions = rawTransactions as AdminTransaction[];

  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">Bets & Transactions</h2>
      <div className="grid grid-cols-2 gap-4">
        {/* Bets */}
        <div>
          <h3 className="font-semibold mb-2">Bets</h3>
          <ul className="space-y-2">
            {bets.map((b: AdminBet) => (
              <li
                key={b.id}
                className="flex justify-between items-center border-b py-2"
              >
                <div>
                  <span className="font-medium">{b.userName}</span>{' '}
                  wagered{' '}
                  <span className="font-semibold">{b.amount}</span> on{' '}
                  <span className="italic">{b.prediction.title}</span>
                </div>
                <button
                  className="px-3 py-1 bg-yellow-500 text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
                  onClick={() => refundBet(b.id)}
                >
                  Refund
                </button>
              </li>
            ))}
            {bets.length === 0 && (
              <li className="text-[var(--color-tertiary)]">
                No bets to display.
              </li>
            )}
          </ul>
        </div>

        {/* Transactions */}
        <div>
          <h3 className="font-semibold mb-2">Transactions</h3>
          <ul className="space-y-2">
            {transactions.map((t: AdminTransaction) => (
              <li key={t.id} className="border-b py-2">
                <span className="font-medium">{t.userName}</span>{' '}
                {t.type.toLowerCase()} of{' '}
                <span className="font-semibold">{t.amount}</span>{' '}
                (balance: <span className="font-semibold">{t.balanceAfter}</span>)
              </li>
            ))}
            {transactions.length === 0 && (
              <li className="text-[var(--color-tertiary)]">
                No transactions to display.
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default BetsTransactions;
