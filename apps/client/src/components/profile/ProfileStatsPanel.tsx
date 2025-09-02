// apps/client/src/components/profile/ProfileStatsPanel.tsx
import { useState } from 'react';
import { ProfileAchievements } from './ProfileAchievements';
import { ProfileStats } from './ProfileStats';
import ProfilePongStats from './ProfilePongStats';

interface ProfileStatsPanelProps {
  profile: {
    id: number;
    name: string;
    muskBucks: number | string | bigint;
    rank?: number;
    achievements?: any[];
    badges?: any[];
  };
  stats: any;
  isOwn: boolean;
}

type TabType = 'achievements' | 'stats' | 'pong';

const tabs = [
  { id: 'achievements' as TabType, label: 'Achievements', icon: '🏆' },
  { id: 'stats' as TabType, label: 'Overview', icon: '📊' },
  { id: 'pong' as TabType, label: 'Pong Stats', icon: '🏓' },
];

export function ProfileStatsPanel({ profile, stats, isOwn }: ProfileStatsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('achievements');

  // Helper to convert string/number to number
  const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

  return (
    <div className="bg-surface border border-muted rounded-2xl shadow-lg overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-muted bg-background/50">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-surface text-content border-b-2 border-primary shadow-sm'
                  : 'text-tertiary hover:text-content hover:bg-surface/50'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'achievements' && (
          <div className="p-6">
            <ProfileAchievements
              achievements={profile.achievements || (profile.badges as any)}
              embedded={true}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="p-6">
            {/* Remove outer card styling from ProfileStats */}
            <div className="[&>div:first-child]:!bg-transparent [&>div:first-child]:!border-0 [&>div:first-child]:!shadow-none [&>div:first-child]:!rounded-none [&>div:first-child]:!p-0">
              <ProfileStats
                profile={{ muskBucks: asNum(profile.muskBucks), rank: profile.rank }}
                stats={stats}
                isOwn={isOwn}
              />
            </div>
          </div>
        )}

        {activeTab === 'pong' && (
          <div className="p-6">
            {/* Remove outer card styling from ProfilePongStats */}
            <div className="[&>div:first-child]:!bg-transparent [&>div:first-child]:!border-0 [&>div:first-child]:!shadow-none [&>div:first-child]:!rounded-none [&>div:first-child]:!p-0">
              <ProfilePongStats userId={profile.id} isOwn={isOwn} userName={profile.name} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
