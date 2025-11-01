// apps/client/src/theme/tokens/badge.ts
// Centralized color and motion tokens for badges
import type { BadgeType } from '../../types/badges';

export type PongTierId =
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'MASTER'
  | 'GRANDMASTER';

export interface BadgeVisualTokens {
  background: string;
  gradient?: string;
  border: string;
  text: string;
  glow: string;
  shadow: string;
  lightSweep: string;
}

type PongTierTokens = BadgeVisualTokens;

const defaultTierTokens: PongTierTokens = {
  background: 'rgba(24, 29, 45, 0.72)',
  border: '#a3bffa',
  text: '#f8fbff',
  glow: '#a3bffa',
  shadow: '0 10px 24px rgba(59, 130, 246, 0.2)',
  lightSweep: 'rgba(255, 255, 255, 0.25)',
};

export const PONG_TIER_TOKENS: Record<PongTierId, PongTierTokens> = {
  BRONZE: {
    background: 'rgba(47, 27, 10, 0.92)',
    gradient:
      'linear-gradient(135deg, rgba(47, 27, 10, 0.95) 0%, rgba(65, 34, 12, 0.94) 45%, rgba(89, 45, 14, 0.93) 100%)',
    border: '#c07a45',
    text: '#ffe1c3',
    glow: '#c07a45',
    shadow: '0 10px 24px rgba(192, 122, 69, 0.28)',
    lightSweep: 'rgba(255, 231, 195, 0.35)',
  },
  SILVER: {
    background: 'rgba(32, 42, 58, 0.9)',
    gradient:
      'linear-gradient(135deg, rgba(32, 42, 58, 0.94) 0%, rgba(48, 63, 86, 0.92) 45%, rgba(63, 79, 108, 0.9) 100%)',
    border: '#96a7c5',
    text: '#e8f0ff',
    glow: '#96a7c5',
    shadow: '0 12px 26px rgba(150, 167, 197, 0.24)',
    lightSweep: 'rgba(224, 236, 255, 0.28)',
  },
  GOLD: {
    background: 'rgba(96, 54, 8, 0.92)',
    gradient:
      'linear-gradient(135deg, rgba(78, 44, 6, 0.96) 0%, rgba(126, 72, 8, 0.95) 45%, rgba(181, 113, 16, 0.94) 100%)',
    border: '#f4c35c',
    text: '#ffe7a8',
    glow: '#ffd874',
    shadow: '0 18px 38px rgba(244, 195, 92, 0.45)',
    lightSweep: 'rgba(255, 225, 150, 0.5)',
  },
  PLATINUM: {
    background: 'rgba(26, 36, 50, 0.9)',
    gradient:
      'linear-gradient(135deg, rgba(26, 36, 50, 0.94) 0%, rgba(42, 56, 74, 0.92) 45%, rgba(60, 78, 96, 0.9) 100%)',
    border: '#86c1dd',
    text: '#d9f4ff',
    glow: '#86c1dd',
    shadow: '0 14px 32px rgba(134, 193, 221, 0.22)',
    lightSweep: 'rgba(185, 232, 255, 0.28)',
  },
  DIAMOND: {
    background: 'rgba(18, 78, 113, 0.92)',
    gradient:
      'linear-gradient(135deg, rgba(18, 78, 113, 0.96) 0%, rgba(28, 117, 171, 0.95) 45%, rgba(54, 161, 208, 0.94) 100%)',
    border: '#6be5ff',
    text: '#ecfbff',
    glow: '#6be5ff',
    shadow: '0 20px 40px rgba(107, 229, 255, 0.4)',
    lightSweep: 'rgba(193, 247, 255, 0.5)',
  },
  MASTER: {
    background: 'rgba(61, 16, 94, 0.92)',
    gradient:
      'linear-gradient(135deg, rgba(61, 16, 94, 0.96) 0%, rgba(92, 21, 135, 0.95) 45%, rgba(128, 28, 182, 0.94) 100%)',
    border: '#dfa2ff',
    text: '#fbe7ff',
    glow: '#dfa2ff',
    shadow: '0 20px 40px rgba(223, 162, 255, 0.4)',
    lightSweep: 'rgba(247, 216, 255, 0.48)',
  },
  GRANDMASTER: {
    background: 'rgba(44, 18, 37, 0.92)',
    gradient:
      'linear-gradient(135deg, rgba(61, 22, 45, 0.96) 0%, rgba(116, 39, 63, 0.95) 45%, rgba(173, 57, 81, 0.94) 100%)',
    border: '#ff8fb1',
    text: '#ffe7f1',
    glow: '#ff8fb1',
    shadow: '0 18px 36px rgba(255, 143, 177, 0.3)',
    lightSweep: 'linear-gradient(135deg, rgba(255, 143, 177, 0.4), rgba(139, 211, 255, 0.32))',
  },
};

export const getTierTokens = (tier: string): PongTierTokens => {
  const upperTier = tier.toUpperCase() as PongTierId;
  return PONG_TIER_TOKENS[upperTier] ?? defaultTierTokens;
};

// ─────────────────────────────────────────────────────────────────────────────
// Badge Type Tokens
// ─────────────────────────────────────────────────────────────────────────────

type BadgeTypeTokens = BadgeVisualTokens;

const typeDefaults: BadgeTypeTokens = {
  background: 'rgba(37, 44, 61, 0.9)',
  border: '#8792a2',
  text: '#f0f4ff',
  glow: '#8792a2',
  shadow: '0 10px 24px rgba(135, 146, 162, 0.25)',
  lightSweep: 'rgba(255, 255, 255, 0.2)',
};

export const BADGE_TYPE_TOKENS: Partial<Record<BadgeType, BadgeTypeTokens>> = {
  HIGH_ROLLER: {
    background: 'rgba(58, 18, 65, 0.9)',
    gradient:
      'linear-gradient(135deg, rgba(58, 18, 65, 0.94) 0%, rgba(72, 22, 70, 0.93) 45%, rgba(90, 24, 68, 0.92) 100%)',
    border: '#ff8fce',
    text: '#ffe7ff',
    glow: '#ff8fce',
    shadow: '0 16px 36px rgba(255, 143, 206, 0.32)',
    lightSweep: 'rgba(255, 195, 255, 0.4)',
  },
  STREAK: {
    background: 'rgba(61, 29, 4, 0.9)',
    gradient:
      'linear-gradient(135deg, rgba(61, 29, 4, 0.93) 0%, rgba(93, 44, 6, 0.92) 45%, rgba(116, 56, 8, 0.91) 100%)',
    border: '#ff9f4a',
    text: '#ffe2c7',
    glow: '#ff9f4a',
    shadow: '0 12px 28px rgba(255, 159, 74, 0.28)',
    lightSweep: 'rgba(255, 204, 170, 0.35)',
  },
  BOT: {
    background: 'rgba(25, 34, 52, 0.9)',
    gradient:
      'linear-gradient(135deg, rgba(25, 34, 52, 0.92) 0%, rgba(36, 50, 73, 0.91) 45%, rgba(46, 66, 93, 0.9) 100%)',
    border: '#7dd3fc',
    text: '#d2edff',
    glow: '#7dd3fc',
    shadow: '0 12px 28px rgba(125, 211, 252, 0.26)',
    lightSweep: 'rgba(189, 235, 255, 0.32)',
  },
};

export const getBadgeTypeTokens = (badgeType: BadgeType): BadgeTypeTokens => {
  return BADGE_TYPE_TOKENS[badgeType] ?? typeDefaults;
};
