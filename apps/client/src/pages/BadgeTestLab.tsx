import React from 'react';
import PongTierBadge from '../components/pong/PongTierBadge';
import { UnifiedBadge } from '../components/common/UnifiedBadge';
import { BADGE_TYPES, BADGE_RARITIES, type BadgeData, type BadgeRarity } from '../types/badges';
import { LeaderboardEntry } from '../components/leaderboard/LeaderboardEntry';
import type { UnifiedLeaderboardEntry } from '../components/leaderboard/types';
import type { PongLeaderboardView } from '@ems/types';
import {
  getBadgeTypeTokens,
  PONG_TIER_TOKENS,
  type BadgeVisualTokens,
} from '../theme/tokens/badge';

const rarityLabels: Array<{ rarity: BadgeRarity; label: string }> = [
  { rarity: BADGE_RARITIES.COMMON, label: 'Common' },
  { rarity: BADGE_RARITIES.UNCOMMON, label: 'Uncommon' },
  { rarity: BADGE_RARITIES.RARE, label: 'Rare' },
  { rarity: BADGE_RARITIES.EPIC, label: 'Epic' },
  { rarity: BADGE_RARITIES.LEGENDARY, label: 'Legendary' },
];

const typeBadges: BadgeData[] = [
  {
    type: BADGE_TYPES.BOT,
    text: 'BOT',
    rarity: BADGE_RARITIES.COMMON,
    customColors: getBadgeTypeTokens(BADGE_TYPES.BOT),
    variant: 'glass',
  },
  {
    type: BADGE_TYPES.STREAK,
    text: '7 streak',
    rarity: BADGE_RARITIES.UNCOMMON,
    customColors: getBadgeTypeTokens(BADGE_TYPES.STREAK),
    variant: 'glass',
  },
  {
    type: BADGE_TYPES.HIGH_ROLLER,
    text: 'High Roller',
    rarity: BADGE_RARITIES.RARE,
    customColors: getBadgeTypeTokens(BADGE_TYPES.HIGH_ROLLER),
    variant: 'glass',
  },
];

const badgeTokensToPreview = Object.entries(PONG_TIER_TOKENS) as Array<[string, BadgeVisualTokens]>;

const tierPreviewElo: Record<string, number> = {
  BRONZE: 860,
  SILVER: 1150,
  GOLD: 1560,
  PLATINUM: 1925,
  DIAMOND: 2320,
  MASTER: 2725,
  GRANDMASTER: 3120,
};

const mockPongData: PongLeaderboardView = {
  userId: 9999,
  userName: 'Badge Tester',
  avatarUrl:
    'https://avatars.dicebear.com/api/open-peeps/badge-tester.svg?background=%23121d2f&scale=95',
  eloRating: 2675,
  tier: 'MASTER',
  gamesPlayed: 212,
  wins: 158,
  winRate: 0.745,
  winStreak: 12,
  bestStreak: 18,
  perfectGames: 4,
  comebacks: 9,
  totalWagered: '2450000000',
  totalWon: '3925000000',
  profit: '1475000000',
  biggestWin: '250000000',
  rank: 3,
  riskTaker: true,
};

const sampleLeaderboardEntry: UnifiedLeaderboardEntry = {
  id: mockPongData.userId,
  userName: mockPongData.userName,
  avatarUrl: mockPongData.avatarUrl,
  primaryStat: {
    label: 'Elo Rating',
    value: mockPongData.eloRating.toString(),
    highlight: true,
    color: 'text-blue-300',
  },
  secondaryStats: [
    { label: 'Wins', value: mockPongData.wins.toString(), color: 'text-green-300' },
    {
      label: 'Win Rate',
      value: `${(mockPongData.winRate * 100).toFixed(1)}%`,
      color: 'text-blue-400',
    },
    {
      label: 'Perfect Games',
      value: (mockPongData.perfectGames ?? 0).toString(),
      color: 'text-purple-300',
    },
    { label: 'Wagered', value: '₿ 2.45M', color: 'text-amber-300' },
  ],
  badges: [
    {
      type: BADGE_TYPES.TIER,
      text: mockPongData.tier,
      tier: mockPongData.tier,
      elo: mockPongData.eloRating,
    },
    {
      type: BADGE_TYPES.HIGH_ROLLER,
      text: 'High Roller',
      rarity: BADGE_RARITIES.RARE,
      customColors: getBadgeTypeTokens(BADGE_TYPES.HIGH_ROLLER),
      variant: 'glass',
    },
    {
      type: BADGE_TYPES.STREAK,
      text: `${mockPongData.winStreak ?? 0} streak`,
      rarity: BADGE_RARITIES.UNCOMMON,
      customColors: getBadgeTypeTokens(BADGE_TYPES.STREAK),
      variant: 'glass',
    },
  ],
  variant: 'pong',
  rawData: mockPongData,
};

export default function BadgeTestLab(): JSX.Element {
  return (
    <div className="space-y-10 p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-content">Badge Visual QA</h1>
        <p className="text-tertiary">
          Development-only route to preview badge palettes, animations, and leaderboard context.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">Tier Badges</h2>
        <div className="flex flex-wrap gap-4 bg-surface/60 rounded-2xl p-6 border border-muted/40">
          {badgeTokensToPreview.map(([tier]) => (
            <div key={tier} className="flex flex-col items-center gap-2">
              <PongTierBadge
                tier={tier}
                showElo
                eloRating={tierPreviewElo[tier] ?? 1500}
                size="lg"
              />
              <span className="text-sm uppercase text-tertiary tracking-widest">{tier}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">Rarity Baseline</h2>
        <div className="flex flex-wrap gap-4 bg-surface/60 rounded-2xl p-6 border border-muted/40">
          {rarityLabels.map(({ rarity, label }) => (
            <UnifiedBadge key={rarity} type={BADGE_TYPES.STREAK} text={label} rarity={rarity} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">Type Badges</h2>
        <div className="flex flex-wrap gap-4 bg-surface/60 rounded-2xl p-6 border border-muted/40">
          {typeBadges.map((badge) => (
            <UnifiedBadge
              key={badge.type}
              type={badge.type}
              text={badge.text}
              rarity={badge.rarity}
              customColors={badge.customColors}
              variant={badge.variant}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">Leaderboard Context</h2>
        <p className="text-sm text-tertiary">
          A live leaderboard row to confirm badge hierarchy alongside avatars, stats, and layout
          chrome.
        </p>
        <ul className="space-y-4">
          <LeaderboardEntry entry={sampleLeaderboardEntry} rank={3} />
        </ul>
      </section>
    </div>
  );
}
