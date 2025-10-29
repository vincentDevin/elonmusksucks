import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageContainer from '../components/PageContainer';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Use window.location.href for a full page refresh to ensure proper theme and state loading
      if (user.profileComplete) {
        window.location.href = '/timeline';
      } else {
        window.location.href = '/setup-profile';
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      // Navigation will happen automatically via useEffect when user state updates

      // Fallback redirect in case useEffect doesn't trigger properly
      setTimeout(() => {
        if (window.location.pathname === '/login') {
          window.location.href = '/timeline';
        }
      }, 1000);
    } catch (err) {
      setError('Login failed');
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="bg-surface shadow-lg rounded-lg p-8 max-w-md mx-auto text-content transition-colors duration-300">
        <h2 className="text-3xl font-bold mb-6 text-center">Welcome Back</h2>
        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-content">Email Address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1 w-full p-3 bg-background border border-border rounded-lg text-content
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       hover:border-primary/50 transition-all duration-200
                       disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Email address"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-content">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1 w-full p-3 bg-background border border-border rounded-lg text-content
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       hover:border-primary/50 transition-all duration-200
                       disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Password"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg
                     hover:bg-primary-hover active:scale-[0.98] cursor-pointer
                     transition-all duration-200 shadow-md hover:shadow-lg
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary
                     flex items-center justify-center gap-2"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Logging in...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
        <div className="mt-6 space-y-3 text-sm text-center">
          <p>
            <Link
              to="/forgot-password"
              className="text-primary hover:text-primary-hover hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </p>
          <p className="text-tertiary">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary hover:text-primary-hover font-medium hover:underline transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Beta Notice */}
        <div className="mt-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <p className="text-sm text-center text-content">
            <strong className="text-warning">Beta Notice:</strong> This site is still in beta.
            Please report any bugs or issues on our{' '}
            <a
              href="https://github.com/vincentDevin/elonmusksucks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover font-medium hover:underline transition-colors"
            >
              GitHub repository
            </a>
            .
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
