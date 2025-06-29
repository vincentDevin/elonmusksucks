import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ParlayProvider } from './contexts/ParlayContext';
import AppRoutes from './routes/AppRoutes';
import MainLayout from './components/MainLayout';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <ParlayProvider>
            <MainLayout>
              <AppRoutes />
            </MainLayout>
          </ParlayProvider>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
