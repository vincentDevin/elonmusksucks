import React from 'react';
import type { TabType } from './AdminAchievementDashboard';

interface AdminAchievementTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: Record<TabType, number>;
  className?: string;
}

const AdminAchievementTabs: React.FC<AdminAchievementTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
  className = '',
}) => {
  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: '📊' },
    { key: 'active' as const, label: 'Active', icon: '✅' },
    { key: 'inactive' as const, label: 'Inactive', icon: '⏸️' },
    { key: 'rule-builder' as const, label: 'Rule Builder', icon: '⚙️' },
  ];

  return (
    <div className={`bg-surface rounded-lg border border-muted ${className}`}>
      <nav className="flex border-b border-muted">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-primary text-primary bg-primary/5'
                : 'text-tertiary hover:text-content hover:bg-background/50'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
            {counts[tab.key] !== undefined && (
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  activeTab === tab.key ? 'bg-primary text-white' : 'bg-muted text-tertiary'
                }`}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default AdminAchievementTabs;
