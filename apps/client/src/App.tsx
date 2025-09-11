// apps/client/src/App.tsx
import { BrowserRouter } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { EventBusCoreProvider } from './contexts/EventBusCoreContext';
import { EventBusMetricsProvider } from './contexts/EventBusMetricsContext';
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
import EventFlowTest from './components/debug/EventFlowTest';
import { EventMetricsDashboard } from './components/debug/EventMetricsDashboard';
import EventHandlers from './components/EventHandlers';

// Inner component that has access to auth context
function AppContent() {
  const { user } = useAuth();

  return (
    <SocketProvider>
      <EventBusCoreProvider>
        {/* Metrics context only for debug components - isolated re-renders */}
        <EventBusMetricsProvider>
          <UnifiedThemeProvider userId={user?.id}>
            {/* domain state that depends on socket/auth */}
            <ActivityProvider>
              <AchievementProvider>
                <PredictionProvider>
                  <ParlayProvider>
                    <ChatProvider>
                      {/* Central event handlers for all 73+ Redis channels */}
                      <EventHandlers />
                      <AppRoutes />
                      {/* Global Pong Elo notifications */}
                      <PongEloNotification />
                      {/* Global Achievement celebrations */}
                      <AchievementCelebrationContainer />
                      {/* Development tools - only in development */}
                      {process.env.NODE_ENV === 'development' && (
                        <>
                          <EventFlowTest />
                          <EventMetricsDashboard />
                        </>
                      )}
                    </ChatProvider>
                  </ParlayProvider>
                </PredictionProvider>
              </AchievementProvider>
            </ActivityProvider>
          </UnifiedThemeProvider>
        </EventBusMetricsProvider>
      </EventBusCoreProvider>
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
