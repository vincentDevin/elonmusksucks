import React from 'react';

export type TabType = 'pending' | 'approved' | 'resolved' | 'rejected';

interface Tab {
  key: TabType;
  label: string;
  count: number;
  icon: string;
  color: string;
}

interface PredictionTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  analytics: {
    totalPending: number;
    totalApproved: number;
    totalResolved: number;
    totalRejected: number;
  };
  className?: string;
}

const PredictionTabs: React.FC<PredictionTabsProps> = ({
  activeTab,
  onTabChange,
  analytics,
  className = '',
}) => {
  const tabs: Tab[] = [
    {
      key: 'pending',
      label: 'Pending',
      count: analytics.totalPending,
      icon: '⏳',
      color: 'border-warning text-warning',
    },
    {
      key: 'approved',
      label: 'Approved',
      count: analytics.totalApproved,
      icon: '✅',
      color: 'border-success text-success',
    },
    {
      key: 'resolved',
      label: 'Resolved',
      count: analytics.totalResolved,
      icon: '⚡',
      color: 'border-primary text-primary',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      count: analytics.totalRejected,
      icon: '❌',
      color: 'border-error text-error',
    },
  ];

  return (
    <div className={`${className}`}>
      {/* Mobile Dropdown */}
      <div className="md:hidden">
        <select
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value as TabType)}
          className="w-full px-3 py-2 bg-surface border border-muted rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {tabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.icon} {tab.label} ({tab.count})
            </option>
          ))}
        </select>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:flex bg-surface rounded-lg border border-muted p-1">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.key;
          const isFirst = index === 0;
          const isLast = index === tabs.length - 1;

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium relative
                ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-tertiary hover:text-content hover:bg-muted/50'
                }
                ${isFirst ? 'rounded-l-md' : ''}
                ${isLast ? 'rounded-r-md' : ''}
              `}
            >
              <span className={isActive ? 'text-white' : tab.color.split(' ')[1]}>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className={`
                px-1.5 py-0.5 rounded-full text-xs font-semibold min-w-[20px] text-center
                ${isActive ? 'bg-white/20 text-white' : 'bg-muted text-tertiary'}
              `}
              >
                {tab.count}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                  <div className="w-2 h-2 bg-primary rotate-45"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Info */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-tertiary">
          <span className={tabs.find((t) => t.key === activeTab)?.color.split(' ')[1]}>
            {tabs.find((t) => t.key === activeTab)?.icon}
          </span>
          <span>
            Showing {tabs.find((t) => t.key === activeTab)?.count || 0} {activeTab} predictions
          </span>
        </div>

        <div className="text-tertiary">
          {activeTab === 'pending' && 'Awaiting approval'}
          {activeTab === 'approved' && 'Ready for betting'}
          {activeTab === 'resolved' && 'Completed predictions'}
          {activeTab === 'rejected' && 'Not approved'}
        </div>
      </div>
    </div>
  );
};

export default PredictionTabs;
