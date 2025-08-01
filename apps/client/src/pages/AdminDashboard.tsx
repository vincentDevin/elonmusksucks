import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../contexts/AdminContext';
import UnifiedUserManagement from '../components/admin/UnifiedUserManagement';
import ModernPredictionQueue from '../components/admin/ModernPredictionQueue';
import BetsTransactions from '../components/admin/BetsTransactions';
import BadgesManager from '../components/admin/BadgesManager';
import UserStats from '../components/admin/UserStats';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { loadUsers, loadPendingPredictions, loadBets, loadTransactions, loadBadges } = useAdmin();

  const tabs = [
    { key: 'users', label: 'User Management', component: <UnifiedUserManagement /> },
    { key: 'predictions', label: 'Prediction Management', component: <ModernPredictionQueue /> },
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
    return <div className="p-4 text-accent">Access denied. Admins only.</div>;
  }

  return (
    <div className="p-4 bg-background text-content">
      <h1 className="text-2xl font-bold text-primary mb-4">Admin Dashboard</h1>
      <nav className="flex space-x-4 border-b border-muted">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 px-4 -mb-px cursor-pointer font-medium transition ${
              activeTab === tab.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-primary'
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
