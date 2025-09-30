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
import { ReactionProvider } from './contexts/ReactionContext';
import AppRoutes from './routes/AppRoutes';
import { useAuth } from './contexts/AuthContext';
import PongEloNotification from './components/pong/PongEloNotification';
import { AchievementCelebrationContainer } from './components/achievements/AchievementCelebrationContainer';
import EventFlowTest from './components/debug/EventFlowTest';
import { EventMetricsDashboard } from './components/debug/EventMetricsDashboard';
import { LeakDetectionPanel } from './components/debug/LeakDetectionPanel';
import EventHandlers from './components/EventHandlers';
import HydrationMarker from './components/HydrationMarker';
import { useListenerMonitoring } from './hooks/useListenerMonitoring';

// Development-only listener monitoring component
function ListenerMonitor() {
  useListenerMonitoring();
  return null; // No UI needed
}

// Inner component that has access to auth context
function AppContent() {
  const { user } = useAuth();

  return (
    <>
      {/* Metrics context only for debug components - isolated re-renders */}
      <EventBusMetricsProvider>
        <UnifiedThemeProvider userId={user?.id}>
          {/* domain state that depends on socket/auth */}
          <ActivityProvider>
            <AchievementProvider>
              <ReactionProvider>
                <PredictionProvider>
                  <ParlayProvider>
                    <ChatProvider>
                      {/* Hydration marker to enable safe event processing */}
                      <HydrationMarker />
                      {/* Central event handlers for all 73+ Redis channels */}
                      <EventHandlers />
                      <AppRoutes />
                      {/* Global Pong Elo notifications */}
                      <PongEloNotification />
                      {/* Global Achievement celebrations */}
                      <AchievementCelebrationContainer />
                      {/* Development tools - only in development */}
                      {/* 
                    {(import.meta.env.DEV || process.env.NODE_ENV === 'development') && (
                      <>
                        <ListenerMonitor />
                        {// <EventFlowTest /> - DISABLED to reduce duplicate listeners }
                        <EventMetricsDashboard />
                        <LeakDetectionPanel />
                      </>
                    )}
                    */}
                    </ChatProvider>
                  </ParlayProvider>
                </PredictionProvider>
              </ReactionProvider>
            </AchievementProvider>
          </ActivityProvider>
        </UnifiedThemeProvider>
      </EventBusMetricsProvider>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <EventBusCoreProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </EventBusCoreProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}
