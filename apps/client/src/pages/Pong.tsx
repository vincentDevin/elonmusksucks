import { PongGameOptimized } from '../components/pong/PongGameOptimized';
import { useAuth } from '../hooks/useAuth';

export default function Pong() {
  const { user } = useAuth();

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
