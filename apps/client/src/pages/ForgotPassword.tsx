// Rollback: Restore any type for form error handling
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { requestPasswordReset } from '../api/auth';
import PageContainer from '../components/PageContainer';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ForgotPassword() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      window.location.href = '/timeline';
    }
  }, [user]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email === '' ? true : emailRegex.test(email);
  const isFormValid = email !== '' && isEmailValid;
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setFormError(null);
    setStatus('sending');
    setError(null);
    try {
      await requestPasswordReset(email);
      setStatus('sent');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <PageContainer>
        <div className="max-w-md mx-auto p-8 bg-surface rounded-lg shadow-lg transition-colors duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2 text-content">Check Your Inbox</h2>
            <p className="text-tertiary">
              If an account exists for <strong className="text-content">{email}</strong>, you'll
              receive a link to reset your password. Please allow a few minutes.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              to="/login"
              className="inline-block w-full text-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-all duration-200 font-medium shadow-md hover:shadow-lg cursor-pointer"
            >
              Return to Login
            </Link>
            <p className="text-sm text-center text-tertiary">
              Didn't receive the email? Check your spam folder.
            </p>
          </div>
        </div>
      </PageContainer>
    );
  }

  const isLoading = status === 'sending';

  return (
    <PageContainer>
      <div className="max-w-md mx-auto p-8 bg-surface rounded-lg shadow-lg text-content transition-colors duration-300">
        <h2 className="text-3xl font-bold mb-6 text-center">Forgot Password</h2>
        <p className="text-tertiary text-center mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        {(status === 'error' || formError) && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {formError || error || 'Unable to send reset link.'}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-content">Email Address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className={`mt-1 w-full p-3 bg-background rounded-lg text-content
                       focus:outline-none focus:ring-2 focus:border-transparent
                       hover:border-primary/50 transition-all duration-200
                       disabled:opacity-60 disabled:cursor-not-allowed ${
                         email === ''
                           ? 'border border-border focus:ring-primary'
                           : isEmailValid
                             ? 'border-2 border-success focus:ring-success'
                             : 'border-2 border-error focus:ring-error'
                       }`}
              aria-label="Email address"
            />
            {email !== '' && !isEmailValid && (
              <p className="text-error text-xs mt-1">Invalid email format.</p>
            )}
          </label>
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium cursor-pointer
                     transition-all duration-200 shadow-md
                     flex items-center justify-center gap-2
                     ${
                       isFormValid && !isLoading
                         ? 'bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-lg active:scale-[0.98]'
                         : 'bg-muted text-tertiary cursor-not-allowed'
                     }`}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Sending...</span>
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-primary hover:text-primary-hover hover:underline transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
