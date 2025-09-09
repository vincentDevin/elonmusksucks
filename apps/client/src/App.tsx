// apps/client/src/App.tsx
import { BrowserRouter } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider } from './contexts/AuthContext';
import { UnifiedThemeProvider } from './theme';
import { PredictionProvider } from './contexts/PredictionContext';
import { ParlayProvider } from './contexts/ParlayContext';
import { ChatProvider } from './contexts/ChatContext';
import { ActivityProvider } from './contexts/ActivityContext';
import { AchievementProvider } from './contexts/AchievementContext';
import AppRoutes from './routes/AppRoutes';
import { useAuth } from './contexts/AuthContext';
import PongEloNotification from './components/pong/PongEloNotification';
import { AchievementCelebrationContainer } from './components/achievements/AchievementCelebrationContainer';

// Inner component that has access to auth context
function AppContent() {
  const { user } = useAuth();

  return (
    <SocketProvider>
      <UnifiedThemeProvider userId={user?.id}>
        {/* domain state that depends on socket/auth */}
        <ActivityProvider>
          <AchievementProvider>
            <PredictionProvider>
              <ParlayProvider>
                <ChatProvider>
                  <AppRoutes />
                  {/* Global Pong Elo notifications */}
                  <PongEloNotification />
                  {/* Global Achievement celebrations */}
                  <AchievementCelebrationContainer />
                </ChatProvider>
              </ParlayProvider>
            </PredictionProvider>
          </AchievementProvider>
        </ActivityProvider>
      </UnifiedThemeProvider>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
