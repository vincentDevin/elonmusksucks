import { useEffect } from 'react';
import { PongGameOptimized } from '../components/pong/PongGameOptimized';
import { useAuth } from '../hooks/useAuth';

export default function Pong() {
  const { user, refreshUserBalance } = useAuth();

  // Refresh balance when component unmounts (user leaves pong page)
  useEffect(() => {
    return () => {
      // User is leaving pong page, refresh their balance to catch any game payouts
      refreshUserBalance();
    };
  }, [refreshUserBalance]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-content mb-4">Authentication Required</h1>
          <p className="text-tertiary">Please log in to play Pong</p>
        </div>
      </div>
    );
  }

  return <PongGameOptimized />;
}
