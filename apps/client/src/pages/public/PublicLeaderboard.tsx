import React from 'react';
import LeaderboardPage from '../../public/components/LeaderboardPage';
import { usePublicData } from '../../hooks/usePublicData';

export default function PublicLeaderboard() {
  const serverData = usePublicData('/leaderboard');

  return <LeaderboardPage {...serverData} />;
}
