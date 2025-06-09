import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email === '' ? true : emailRegex.test(email);
  const isPasswordValid = password === '' ? true : password.length >= 8;
  const isConfirmValid = confirm === '' ? true : password === confirm;

  const isFormValid = email && isEmailValid && password && isPasswordValid && confirm && isConfirmValid;

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
    try {
      await register(name, email, password);
      setVerificationSent(true);
    } catch (err) {
      setError('Registration failed');
    }
  };

  if (verificationSent) {
    return (
      <div className="container mx-auto my-8 px-4 bg-background text-content min-h-screen transition-colors duration-300">
        <div className="bg-surface shadow rounded-lg p-6 max-w-md mx-auto text-content transition-colors duration-300">
          <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
          <p>Please check <strong>{email}</strong> for a verification link.</p>
          <p>Once verified, you can <Link to="/login" className="text-blue-600 hover:underline">log in here</Link>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto my-8 px-4 bg-background text-content min-h-screen transition-colors duration-300">
      <div className="bg-surface shadow rounded-lg p-6 max-w-md mx-auto text-content transition-colors duration-300">
        <h2 className="text-2xl font-bold mb-4">Register</h2>
        {error && <p className="text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-300"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Email Address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`mt-1 w-full p-3 rounded focus:outline-none focus:ring ${
                email === '' ? 'border border-gray-300' :
                isEmailValid ? 'border border-green-500' : 'border border-red-500'
              }`}
            />
          </label>
          {!isEmailValid && <p className="text-red-500 text-xs mt-1">Invalid email format.</p>}
          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`mt-1 w-full p-3 rounded focus:outline-none focus:ring ${
                password === '' ? 'border border-gray-300' :
                isPasswordValid ? 'border border-green-500' : 'border border-red-500'
              }`}
            />
          </label>
          {!isPasswordValid && <p className="text-red-500 text-xs mt-1">Password must be at least 8 characters.</p>}
          <label className="block">
            <span className="text-sm font-medium">Confirm Password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className={`mt-1 w-full p-3 rounded focus:outline-none focus:ring ${
                confirm === '' ? 'border border-gray-300' :
                isConfirmValid ? 'border border-green-500' : 'border border-red-500'
              }`}
            />
          </label>
          {!isConfirmValid && <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>}
          <button
            type="submit"
            disabled={!isFormValid}
            className={`w-full py-2 px-4 rounded text-white 
              ${isFormValid 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-400 cursor-not-allowed'}`
            }
          >
            {isFormValid ? 'Register' : 'Complete form to register'}
          </button>
        </form>
      </div>
    </div>
  );
}
