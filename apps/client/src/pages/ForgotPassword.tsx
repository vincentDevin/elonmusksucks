import { useState } from 'react';
import { requestPasswordReset } from '../api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

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
    setStatus('idle');
    setError(null);
    try {
      await requestPasswordReset(email);
      setStatus('sent');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="max-w-md mx-auto p-6 bg-surface rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Check Your Inbox</h2>
        <p>
          If an account exists for <strong>{email}</strong>, you’ll receive a link to reset your
          password. Please allow a few minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-surface rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4">Forgot Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mt-1 w-full px-3 py-2 rounded focus:outline-none focus:ring ${
              email === ''
                ? 'border border-gray-300'
                : isEmailValid
                  ? 'border border-green-500'
                  : 'border border-red-500'
            }`}
          />
          {!isEmailValid && <p className="text-red-500 text-xs mt-1">Invalid email format.</p>}
        </label>
        {status === 'error' && (
          <p className="text-red-500 text-sm">{error || 'Unable to send reset link.'}</p>
        )}
        {formError && <p className="text-red-500 text-sm">{formError}</p>}
        <button
          type="submit"
          disabled={!isFormValid}
          className={`w-full px-4 py-2 rounded text-white ${
            isFormValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Send Reset Link
        </button>
      </form>
    </div>
  );
}
