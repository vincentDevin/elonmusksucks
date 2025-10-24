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
import { BookmarkProvider } from './contexts/BookmarkContext';
import { NotificationProvider, NotificationContainer } from './components/notifications';
import AppRoutes from './routes/AppRoutes';
import { useAuth } from './contexts/AuthContext';
import EventHandlers from './components/EventHandlers';
import HydrationMarker from './components/HydrationMarker';

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
                <BookmarkProvider>
                  <PredictionProvider>
                    <ParlayProvider>
                      <ChatProvider>
                        {/* Unified Notification System */}
                        <NotificationProvider>
                          {/* Hydration marker to enable safe event processing */}
                          <HydrationMarker />
                          {/* Central event handlers - subscribes to all events and routes notifications */}
                          <EventHandlers />
                          <AppRoutes />
                          {/* Unified notification container */}
                          <NotificationContainer />
                        </NotificationProvider>
                      </ChatProvider>
                    </ParlayProvider>
                  </PredictionProvider>
                </BookmarkProvider>
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
