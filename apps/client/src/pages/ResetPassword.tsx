import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { performPasswordReset } from '../api/auth';
import PageContainer from '../components/PageContainer';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ResetPassword() {
  const query = useQuery();
  const { user } = useAuth();
  const token = query.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const isPasswordValid = password === '' ? true : password.length >= 8;
  const isConfirmValid = confirm === '' ? true : password === confirm;
  const isFormValid = password !== '' && isPasswordValid && confirm !== '' && isConfirmValid;

  useEffect(() => {
    if (user) {
      window.location.href = '/timeline';
    }
  }, [user]);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isPasswordValid) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (!isConfirmValid) {
      setFormError('Passwords do not match.');
      return;
    }
    setFormError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setStatus('submitting');
    try {
      await performPasswordReset({ token, newPassword: password });
      setStatus('success');
      toast.success('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
      setStatus('idle');
      toast.error('Failed to reset password. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <PageContainer>
        <div className="max-w-md mx-auto p-8 bg-surface rounded-lg shadow-lg text-content transition-colors duration-300">
          <div className="text-center">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2">Password Reset!</h2>
            <p className="text-tertiary mb-6">
              Your password has been successfully reset. Redirecting to login...
            </p>
            <LoadingSpinner size="md" className="mx-auto" />
          </div>
        </div>
      </PageContainer>
    );
  }

  const isLoading = status === 'submitting';

  return (
    <PageContainer>
      <div className="max-w-md mx-auto p-8 bg-surface rounded-lg shadow-lg text-content transition-colors duration-300">
        <h2 className="text-3xl font-bold mb-6 text-center">Reset Password</h2>
        <p className="text-tertiary text-center mb-6">Enter your new password below.</p>
        {(formError || error) && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {formError || error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-content">New Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className={`mt-1 w-full p-3 bg-background rounded-lg text-content
                       focus:outline-none focus:ring-2 focus:border-transparent
                       hover:border-primary/50 transition-all duration-200
                       disabled:opacity-60 disabled:cursor-not-allowed ${
                         password === ''
                           ? 'border border-border focus:ring-primary'
                           : isPasswordValid
                             ? 'border-2 border-success focus:ring-success'
                             : 'border-2 border-error focus:ring-error'
                       }`}
              aria-label="New password"
            />
            {password !== '' && !isPasswordValid && (
              <p className="text-error text-xs mt-1">Password must be at least 8 characters.</p>
            )}
          </label>
          <label className="block">
            <span className="text-sm font-medium text-content">Confirm Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={isLoading}
              className={`mt-1 w-full p-3 bg-background rounded-lg text-content
                       focus:outline-none focus:ring-2 focus:border-transparent
                       hover:border-primary/50 transition-all duration-200
                       disabled:opacity-60 disabled:cursor-not-allowed ${
                         confirm === ''
                           ? 'border border-border focus:ring-primary'
                           : isConfirmValid
                             ? 'border-2 border-success focus:ring-success'
                             : 'border-2 border-error focus:ring-error'
                       }`}
              aria-label="Confirm password"
            />
            {confirm !== '' && !isConfirmValid && (
              <p className="text-error text-xs mt-1">Passwords do not match.</p>
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
                <span>Resetting...</span>
              </>
            ) : (
              'Reset Password'
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
