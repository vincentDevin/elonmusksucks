import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';
import MainLayout from './components/MainLayout';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <BrowserRouter>
        <MainLayout>
        <AppRoutes />
        </MainLayout>
      </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
