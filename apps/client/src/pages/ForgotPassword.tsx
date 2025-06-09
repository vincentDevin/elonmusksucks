import { useState } from 'react'
import { requestPasswordReset } from '../api/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('idle')
    setError(null)
    try {
      await requestPasswordReset(email)
      setStatus('sent')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
        <div className="max-w-md mx-auto p-6 bg-surface rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Check Your Inbox</h2>
          <p>
            If an account exists for <strong>{email}</strong>, you’ll receive a link to reset your
            password. Please allow a few minutes.
          </p>
        </div>
    )
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
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring"
            />
          </label>
          {status === 'error' && (
            <p className="text-red-500 text-sm">{error || 'Unable to send reset link.'}</p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Send Reset Link
          </button>
        </form>
      </div>
  )
}