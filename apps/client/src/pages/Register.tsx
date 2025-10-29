import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageContainer from '../components/PageContainer';
import LoadingSpinner from '../components/LoadingSpinner';
import TermsOfServiceModal from '../components/auth/TermsOfServiceModal';
import PrivacyPolicyModal from '../components/auth/PrivacyPolicyModal';
import { CurrencyDollarIcon, ClockIcon, BoltIcon } from '@heroicons/react/24/outline';

export default function Register() {
  const { register, user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    if (user) {
      window.location.href = '/timeline';
    }
  }, [user]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email === '' ? true : emailRegex.test(email);
  const isPasswordValid = password === '' ? true : password.length >= 8;
  const isConfirmValid = confirm === '' ? true : password === confirm;

  const isFormValid =
    name &&
    email &&
    isEmailValid &&
    password &&
    isPasswordValid &&
    confirm &&
    isConfirmValid &&
    agreedToTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Frontend validation
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }
    setIsLoading(true);
    try {
      await register(name, email, password);
      setVerificationSent(true);
    } catch (err) {
      setError('Registration failed');
      setIsLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <PageContainer>
        <div className="bg-surface shadow-lg rounded-lg p-8 max-w-md mx-auto text-content transition-colors duration-300">
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
            <h2 className="text-3xl font-bold mb-2">Check Your Email</h2>
            <p className="text-tertiary">
              We've sent a verification link to
              <br />
              <strong className="text-content">{email}</strong>
            </p>
          </div>
          <div className="space-y-3">
            <Link
              to="/login"
              className="inline-block w-full text-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-all duration-200 font-medium shadow-md hover:shadow-lg cursor-pointer"
            >
              Go to Login Page
            </Link>
            <p className="text-sm text-center text-tertiary">
              Didn't receive the email? Check your spam folder.
            </p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <TermsOfServiceModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />

      <div className="max-w-2xl mx-auto">
        <div className="bg-surface shadow-lg rounded-lg p-8 text-content transition-colors duration-300">
          {/* Welcome Section */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">Join ElonMuskSucks.net</h2>
            <p className="text-tertiary text-sm">
              Bet on predictions, play games, and compete on the leaderboard!
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-background rounded-lg">
            <div className="flex flex-col items-center text-center p-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <CurrencyDollarIcon className="w-7 h-7 text-primary" />
              </div>
              <h4 className="font-semibold text-sm mb-1">1,000 MuskBucks</h4>
              <p className="text-tertiary text-xs">Starting balance</p>
            </div>
            <div className="flex flex-col items-center text-center p-3">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-2">
                <ClockIcon className="w-7 h-7 text-success" />
              </div>
              <h4 className="font-semibold text-sm mb-1">100 Daily Bonus</h4>
              <p className="text-tertiary text-xs">Login rewards</p>
            </div>
            <div className="flex flex-col items-center text-center p-3">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-2">
                <BoltIcon className="w-7 h-7 text-accent" />
              </div>
              <h4 className="font-semibold text-sm mb-1">Compete & Win</h4>
              <p className="text-tertiary text-xs">Climb the leaderboard</p>
            </div>
          </div>

          {/* Registration Form */}
          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-content">Username</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                placeholder="e.g., MuskRat420, TeslaTears, SpaceXFan69"
                className="mt-1 w-full p-3 bg-background border border-border rounded-lg text-content
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       hover:border-primary/50 transition-all duration-200
                       disabled:opacity-60 disabled:cursor-not-allowed
                       placeholder:text-tertiary/50"
                aria-label="Username"
              />
              <p className="text-tertiary text-xs mt-1">
                Choose a funny/creative username —{' '}
                <strong className="text-warning">NOT your real name!</strong>
              </p>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-content">Email Address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
            <label className="block">
              <span className="text-sm font-medium text-content">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
                aria-label="Password"
              />
              {password !== '' && !isPasswordValid && (
                <p className="text-error text-xs mt-1">Password must be at least 8 characters.</p>
              )}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-content">Confirm Password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
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

            <label className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={isLoading}
                className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Agree to terms"
              />
              <span className="text-sm text-tertiary">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-primary hover:text-primary-hover hover:underline transition-colors font-medium"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-primary hover:text-primary-hover hover:underline transition-colors font-medium"
                >
                  Privacy Policy
                </button>
              </span>
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
                  <span>Creating Account...</span>
                </>
              ) : isFormValid ? (
                'Create Account'
              ) : (
                'Complete form to register'
              )}
            </button>
          </form>
          <p className="mt-6 text-sm text-center text-tertiary">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary-hover font-medium hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
