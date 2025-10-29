import React, { useState, useEffect } from 'react';
import type { PublicBadge } from '@ems/types';

interface BadgeSelectorProps {
  value: number | null;
  onChange: (badgeId: number) => void;
  currentBadges?: PublicBadge[];
}

const BadgeSelector: React.FC<BadgeSelectorProps> = ({ value, onChange, currentBadges = [] }) => {
  const [allBadges, setAllBadges] = useState<PublicBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBadges = async () => {
      try {
        // TODO: Replace with actual getAllBadges API call when available
        // const badges = await getAllBadges();
        // setAllBadges(badges);
        setAllBadges([]);
      } catch (error) {
        console.error('Failed to load badges:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBadges();
  }, []);

  // Filter out badges the user already has
  const currentBadgeIds = new Set(currentBadges.map((b) => b.id));
  const availableBadges = allBadges.filter((badge) => !currentBadgeIds.has(badge.id));

  if (loading) {
    return (
      <div className="w-full px-3 py-2 border border-muted rounded-lg bg-background">
        <span className="text-tertiary text-sm">Loading badges...</span>
      </div>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:ring-2 focus:ring-primary focus:border-primary"
    >
      <option value="">Select a badge to assign...</option>
      {availableBadges.map((badge) => (
        <option key={badge.id} value={badge.id}>
          {badge.name} - {badge.description}
        </option>
      ))}
    </select>
  );
};

export default BadgeSelector;
