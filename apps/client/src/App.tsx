import { BrowserRouter } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider } from './contexts/AuthContext';
import { ParlayProvider } from './contexts/ParlayContext';
import AppRoutes from './routes/AppRoutes';
import MainLayout from './components/MainLayout';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ThemeProvider>
          <ChatProvider>
            <BrowserRouter>
              <ParlayProvider>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </ParlayProvider>
            </BrowserRouter>
          </ChatProvider>
        </ThemeProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
