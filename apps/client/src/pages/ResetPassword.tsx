import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { performPasswordReset } from '../api/auth'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function ResetPassword() {
  const query = useQuery()
  const navigate = useNavigate()
  const token = query.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setStatus('submitting')
    try {
      await performPasswordReset({ token, newPassword: password })
      setStatus('success')
      // you could use a toast here instead of alert
      alert('Password reset! You can now log in.')
      navigate('/login')
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.')
      setStatus('idle')
    }
  }

  if (status === 'success') {
    return null // we already redirected
  }

  return (
      <div className="max-w-md mx-auto p-6 bg-surface rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Reset Password</h2>
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
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Confirm Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring"
            />
          </label>
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Reset Password
          </button>
        </form>
      </div>
  )
}