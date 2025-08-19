// apps/client/src/App.tsx
import { BrowserRouter } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider } from './contexts/AuthContext';
import { UnifiedThemeProvider } from './theme';
import { PredictionProvider } from './contexts/PredictionContext';
import { ParlayProvider } from './contexts/ParlayContext';
import { ChatProvider } from './contexts/ChatContext';
import { UnifiedActivityProvider } from './contexts/UnifiedActivityContext';
import MainLayout from './components/MainLayout';
import AppRoutes from './routes/AppRoutes';
import { useAuth } from './contexts/AuthContext';
import PongEloNotification from './components/pong/PongEloNotification';

// Inner component that has access to auth context
function AppContent() {
  const { user } = useAuth();

  return (
    <SocketProvider>
      <UnifiedThemeProvider userId={user?.id}>
        {/* domain state that depends on socket/auth */}
        <UnifiedActivityProvider>
          <PredictionProvider>
            <ParlayProvider>
              <ChatProvider>
                <MainLayout>
                  <AppRoutes />
                  {/* Global Pong Elo notifications */}
                  <PongEloNotification />
                </MainLayout>
              </ChatProvider>
            </ParlayProvider>
          </PredictionProvider>
        </UnifiedActivityProvider>
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
