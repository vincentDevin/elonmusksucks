import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../contexts/AdminContext';
import UnifiedUserManagement from '../components/admin/UnifiedUserManagement';
import ModernPredictionQueue from '../components/admin/ModernPredictionQueue';
import UnifiedFinancialDashboard from '../components/admin/UnifiedFinancialDashboard';
import AdvancedBadgeManager from '../components/admin/AdvancedBadgeManager';
import AdvancedAnalyticsDashboard from '../components/admin/AdvancedAnalyticsDashboard';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { loadUsers, loadPendingPredictions, loadBadges } = useAdmin();

  const tabs = [
    { key: 'users', label: 'User Management & Moderation', component: <UnifiedUserManagement /> },
    { key: 'predictions', label: 'Prediction Management', component: <ModernPredictionQueue /> },
    { key: 'bets', label: 'Financial Operations', component: <UnifiedFinancialDashboard /> },
    { key: 'badges', label: 'Badge Management', component: <AdvancedBadgeManager /> },
    { key: 'analytics', label: 'Advanced Analytics', component: <AdvancedAnalyticsDashboard /> },
  ];

  const [activeTab, setActiveTab] = useState<string>(tabs[0].key);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadUsers();
      loadPendingPredictions();
      loadBadges();
    }
  }, [user, loadUsers, loadPendingPredictions, loadBadges]);

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
