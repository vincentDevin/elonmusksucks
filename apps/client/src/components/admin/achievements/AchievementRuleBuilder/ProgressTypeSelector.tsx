import React from 'react';
import type { JsonRuleAchievementData } from '@ems/types';

interface ProgressTypeSelectorProps {
  selectedType: JsonRuleAchievementData['progress']['kind'];
  onTypeChange: (type: JsonRuleAchievementData['progress']['kind']) => void;
  disabled?: boolean;
}

const progressTypes = [
  {
    kind: 'count' as const,
    name: 'Count',
    description: 'Track the number of times an event occurs',
    icon: '🔢',
    examples: 'Win 10 bets, Send 50 messages, Complete 5 predictions',
    useCase: 'Best for simple counting achievements',
  },
  {
    kind: 'streak' as const,
    name: 'Streak',
    description: 'Track consecutive occurrences, with resets on failure',
    icon: '🔥',
    examples: 'Win 5 bets in a row, Daily login streak, Perfect prediction streak',
    useCase: 'Best for achievements requiring consistency',
  },
  {
    kind: 'threshold' as const,
    name: 'Threshold',
    description: 'Track cumulative values that can only increase',
    icon: '📈',
    examples: 'Earn $1000 profit, Spend $500 total, Reach 80% win rate',
    useCase: 'Best for financial milestones or percentages',
  },
  {
    kind: 'binary' as const,
    name: 'Binary',
    description: 'Simple true/false achievement triggered by a condition',
    icon: '✅',
    examples: 'Place first bet, Join a community, Complete profile',
    useCase: 'Best for one-time accomplishments',
  },
];

export const ProgressTypeSelector: React.FC<ProgressTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  disabled = false,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {progressTypes.map((type) => (
        <div
          key={type.kind}
          className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
            selectedType === type.kind
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onTypeChange(type.kind)}
        >
          <div className="flex items-start space-x-3">
            <div className="text-2xl">{type.icon}</div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-content">{type.name}</h4>
                {selectedType === type.kind && (
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                )}
              </div>
              <p className="text-sm text-tertiary mt-1">{type.description}</p>

              <div className="mt-3 space-y-2">
                <div className="text-xs text-tertiary font-medium">USE CASE</div>
                <div className="text-xs text-content">{type.useCase}</div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-xs text-tertiary font-medium">EXAMPLES</div>
                <div className="text-xs text-content">{type.examples}</div>
              </div>
            </div>
          </div>

          {selectedType === type.kind && (
            <div className="mt-4 pt-4 border-t border-muted">
              <div className="text-xs text-primary font-medium">
                ✓ Selected - Configure conditions below
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
