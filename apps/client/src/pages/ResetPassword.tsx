import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { performPasswordReset } from '../api/auth';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ResetPassword() {
  const query = useQuery();
  const navigate = useNavigate();
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
      // you could use a toast here instead of alert
      alert('Password reset! You can now log in.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
      setStatus('idle');
    }
  };

  if (status === 'success') {
    return null; // we already redirected
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-surface rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4">Reset Password</h2>
      {formError && <p className="text-red-500 mb-2">{formError}</p>}
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">New Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`mt-1 w-full px-3 py-2 rounded focus:outline-none focus:ring ${
              password === ''
                ? 'border border-gray-300'
                : isPasswordValid
                  ? 'border border-green-500'
                  : 'border border-red-500'
            }`}
          />
          {!isPasswordValid && (
            <p className="text-red-500 text-xs mt-1">Password must be at least 8 characters.</p>
          )}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Confirm Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`mt-1 w-full px-3 py-2 rounded focus:outline-none focus:ring ${
              confirm === ''
                ? 'border border-gray-300'
                : isConfirmValid
                  ? 'border border-green-500'
                  : 'border border-red-500'
            }`}
          />
          {!isConfirmValid && <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>}
        </label>
        <button
          type="submit"
          disabled={!isFormValid || status === 'submitting'}
          className={`w-full px-4 py-2 rounded text-white ${
            isFormValid
              ? 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Reset Password
        </button>
      </form>
    </div>
  );
}
