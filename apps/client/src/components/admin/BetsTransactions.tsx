import React from 'react';
import { useAdmin } from '../../contexts/AdminContext';

const BetsTransactions: React.FC = () => {
  const { bets, transactions, refundBet } = useAdmin();
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">Bets & Transactions</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold">Bets</h3>
          <ul className="space-y-1">
            {bets.map((b) => (
              <li key={b.id} className="flex justify-between items-center border-b py-1">
                <span>
                  User {b.userId} wagered {b.amount} on {b.predictionId}
                </span>
                <button
                  className="px-2 py-0.5 bg-yellow-500 text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
                  onClick={() => refundBet(b.id)}
                >
                  Refund
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Transactions</h3>
          <ul className="space-y-1">
            {transactions.map((t) => (
              <li key={t.id} className="border-b py-1">
                {t.type} of {t.amount} for user {t.userId} (balance: {t.balanceAfter})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default BetsTransactions;