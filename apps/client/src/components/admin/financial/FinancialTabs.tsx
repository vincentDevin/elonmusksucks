import React from 'react';

interface Tab {
  key: string;
  label: string;
  icon: string;
}

interface FinancialTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const FinancialTabs: React.FC<FinancialTabsProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  const tabs: Tab[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'unified', label: 'Unified View', icon: '🔗' },
    { key: 'bets', label: 'Bets', icon: '🎯' },
    { key: 'transactions', label: 'Transactions', icon: '💳' },
    { key: 'pong', label: 'Pong Activity', icon: '🏓' },
  ];

  return (
    <div className={`bg-surface border border-muted rounded-lg ${className}`}>
      <div className="flex overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-tertiary hover:text-content hover:bg-background'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FinancialTabs;
