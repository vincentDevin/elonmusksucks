import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import UserManagement from '../components/admin/UserManagement';
import PredictionQueue from '../components/admin/PredictionQueue';
import FinancialDashboard from '../components/admin/FinancialDashboard';
import AchievementManager from '../components/achievements/AchievementManager';
import AdvancedAnalyticsDashboard from '../components/admin/AdvancedAnalyticsDashboard';
import FeedsManager from '../components/admin/FeedsManager';
import ModerationQueue from '../components/admin/ModerationQueue';
import EventSystemMonitor from '../components/admin/EventSystemMonitor';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { loadUsers, loadPendingPredictions, loadBadges } = useAdmin();

  const tabs = [
    { key: 'users', label: 'User Management & Moderation', component: <UserManagement /> },
    { key: 'predictions', label: 'Prediction Management', component: <PredictionQueue /> },
    { key: 'bets', label: 'Financial Operations', component: <FinancialDashboard /> },
    { key: 'badges', label: 'Achievement Management', component: <AchievementManager /> },
    { key: 'feeds', label: 'RSS Feeds Management', component: <FeedsManager /> },
    { key: 'moderation', label: 'Content Moderation', component: <ModerationQueue /> },
    { key: 'analytics', label: 'Advanced Analytics', component: <AdvancedAnalyticsDashboard /> },
    { key: 'events', label: 'Event System Monitor', component: <EventSystemMonitor /> },
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
                : 'text-content/70 hover:text-primary'
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
