import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../contexts/AdminContext';
import UserManagement from '../components/admin/UserManagement';
import PredictionQueue from '../components/admin/PredictionQueue';
import BetsTransactions from '../components/admin/BetsTransactions';
import BadgesManager from '../components/admin/BadgesManager';
import UserStats from '../components/admin/UserStats';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { loadUsers, loadPendingPredictions, loadBets, loadTransactions, loadBadges } = useAdmin();

  const tabs = [
    { key: 'users', label: 'User Management', component: <UserManagement /> },
    { key: 'predictions', label: 'Prediction Queue', component: <PredictionQueue /> },
    { key: 'bets', label: 'Bets & Transactions', component: <BetsTransactions /> },
    { key: 'badges', label: 'Badges', component: <BadgesManager /> },
    { key: 'stats', label: 'User Stats', component: <UserStats /> },
  ];

  const [activeTab, setActiveTab] = useState<string>(tabs[0].key);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadUsers();
      loadPendingPredictions();
      loadBets();
      loadTransactions();
      loadBadges();
    }
  }, [user, loadUsers, loadPendingPredictions, loadBets, loadTransactions, loadBadges]);

  if (user?.role !== 'ADMIN') {
    return <div className="p-4 text-[var(--color-accent)]">Access denied. Admins only.</div>;
  }

  return (
    <div className="p-4 bg-[var(--color-background)] text-[var(--color-content)]">
      <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Admin Dashboard</h1>
      <nav className="flex space-x-4 border-b border-[var(--color-muted)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 px-4 -mb-px cursor-pointer font-medium transition ${
              activeTab === tab.key
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="mt-6">{tabs.find((t) => t.key === activeTab)?.component}</div>
    </div>
  );
};

export default AdminDashboard;
