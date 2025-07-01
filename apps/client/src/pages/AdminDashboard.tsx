// apps/client/src/pages/AdminDashboard.tsx
import React, { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAdmin } from '../contexts/AdminContext'

const AdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const {
    users,
    pendingPredictions,
    bets,
    transactions,
    badges,
    statsFor,
    loadUsers,
    loadPendingPredictions,
    loadBets,
    loadTransactions,
    loadBadges,
    loadUserStats,
    updateUserRole,
    activateUser,
    updateUserBalance,
    approvePrediction,
    rejectPrediction,
    refundBet,
    createBadge,
    assignBadge,
    revokeBadge,
  } = useAdmin()

  const [balances, setBalances] = useState<Record<number, number>>({})
  const [selectedAssign, setSelectedAssign] = useState<Record<number, number>>({})
  const [selectedRevoke, setSelectedRevoke] = useState<Record<number, number>>({})
  const [newBadge, setNewBadge] = useState({ name: '', description: '', iconUrl: '' })

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadUsers()
      loadPendingPredictions()
      loadBets()
      loadTransactions()
      loadBadges()
    }
  }, [user, loadUsers, loadPendingPredictions, loadBets, loadTransactions, loadBadges])

  useEffect(() => {
    const map: Record<number, number> = {}
    for (const u of users) {
      map[u.id] = u.muskBucks
    }
    setBalances(map)
  }, [users])

  useEffect(() => {
    users.forEach((u) => loadUserStats(u.id))
  }, [users, loadUserStats])

  if (user?.role !== 'ADMIN') {
    return <div className="p-4 text-[var(--color-accent)]">Access denied. Admins only.</div>
  }

  return (
    <div className="p-4 space-y-8 bg-[var(--color-background)] text-[var(--color-content)]">
      <h1 className="text-2xl font-bold text-[var(--color-primary)]">Admin Dashboard</h1>

      {/* === User Management === */}
      <section>
        <h2 className="text-xl font-semibold mb-2">User Management</h2>
        <table className="w-full bg-[var(--color-surface)] border border-[var(--color-muted)]">
          <thead className="bg-[var(--color-secondary)]">
            <tr>
              {['ID','Name','Email','Role','Active','Balance','Badges'].map((h) => (
                <th key={h} className="border border-[var(--color-muted)] px-2 py-1">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="even:bg-[var(--color-muted)] odd:bg-[var(--color-surface)]">
                <td className="border px-2 py-1">{u.id}</td>
                <td className="border px-2 py-1">{u.name}</td>
                <td className="border px-2 py-1">{u.email}</td>

                {/* Role */}
                <td className="border px-2 py-1">
                  <select
                    value={u.role}
                    onChange={(e) => updateUserRole(u.id, e.target.value as any)}
                    className="border px-1 py-1 bg-[var(--color-surface)] cursor-pointer transition"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>

                {/* Active */}
                <td className="border px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={(u as any).active}
                    onChange={(e) => activateUser(u.id, e.target.checked)}
                    className="cursor-pointer"
                  />
                </td>

                {/* Balance */}
                <td className="border px-2 py-1">
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      className="w-20 border px-1 py-1 bg-[var(--color-surface)]"
                      value={balances[u.id] ?? u.muskBucks}
                      onChange={(e) =>
                        setBalances((b) => ({ ...b, [u.id]: Number(e.target.value) }))
                      }
                    />
                    <button
                      className="px-2 py-1 bg-[var(--color-primary)] text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
                      onClick={() => updateUserBalance(u.id, balances[u.id] ?? u.muskBucks)}
                    >
                      Set
                    </button>
                  </div>
                </td>

                {/* Badge Assignment & Revocation */}
                <td className="border px-2 py-1">
                  <div className="flex flex-col space-y-1">
                    {/* Assign */}
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedAssign[u.id] ?? ''}
                        onChange={(e) =>
                          setSelectedAssign((p) => ({ ...p, [u.id]: Number(e.target.value) }))
                        }
                        className="border px-1 py-1 bg-[var(--color-surface)] cursor-pointer transition"
                      >
                        <option value="">— assign badge —</option>
                        {badges.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <button
                        className="px-2 py-1 bg-[var(--color-primary)] text-[var(--color-surface)] rounded disabled:opacity-50 cursor-pointer hover:opacity-90 transition"
                        disabled={!selectedAssign[u.id]}
                        onClick={() => {
                          assignBadge(u.id, selectedAssign[u.id])
                          setSelectedAssign((p) => ({ ...p, [u.id]: 0 }))
                        }}
                      >
                        Assign
                      </button>
                    </div>
                    {/* Revoke */}
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedRevoke[u.id] ?? ''}
                        onChange={(e) =>
                          setSelectedRevoke((p) => ({ ...p, [u.id]: Number(e.target.value) }))
                        }
                        className="border px-1 py-1 bg-[var(--color-surface)] cursor-pointer transition"
                      >
                        <option value="">— revoke badge —</option>
                        {badges.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <button
                        className="px-2 py-1 bg-red-600 text-[var(--color-surface)] rounded disabled:opacity-50 cursor-pointer hover:opacity-90 transition"
                        disabled={!selectedRevoke[u.id]}
                        onClick={() => {
                          revokeBadge(u.id, selectedRevoke[u.id])
                          setSelectedRevoke((p) => ({ ...p, [u.id]: 0 }))
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* === Prediction Approval Queue === */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Prediction Approval Queue</h2>
        <ul className="space-y-2">
          {pendingPredictions.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between border border-[var(--color-muted)] p-2 rounded bg-[var(--color-surface)]"
            >
              <span>{p.title}</span>
              <div className="space-x-2">
                <button
                  className="px-3 py-1 bg-green-500 text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
                  onClick={() => approvePrediction(p.id)}
                >
                  Approve
                </button>
                <button
                  className="px-3 py-1 bg-red-500 text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
                  onClick={() => rejectPrediction(p.id)}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
          {pendingPredictions.length === 0 && (
            <li className="text-[var(--color-tertiary)]">No pending predictions.</li>
          )}
        </ul>
      </section>

      {/* === Bets & Transactions === */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Bets & Transactions</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">Bets</h3>
            <ul className="space-y-1">
              {bets.map((b) => (
                <li key={b.id} className="flex justify-between items-center border-b py-1">
                  <span>
                    User {b.userId} wagered {b.amount} on {b.predictionId}
                  </span>
                  <button
                    className="px-2 py-0.5 bg-yellow-500 text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
                    onClick={() => refundBet(b.id)}
                  >
                    Refund
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Transactions</h3>
            <ul className="space-y-1">
              {transactions.map((t) => (
                <li key={t.id} className="border-b py-1">
                  {t.type} of {t.amount} for user {t.userId} (balance: {t.balanceAfter})
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* === Badges (create) === */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Badges</h2>
        <div className="flex space-x-2 mb-4">
          <input
            className="border border-[var(--color-muted)] px-2 py-1 flex-1 bg-[var(--color-surface)]"
            placeholder="Name"
            value={newBadge.name}
            onChange={(e) => setNewBadge((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="border border-[var(--color-muted)] px-2 py-1 flex-1 bg-[var(--color-surface)]"
            placeholder="Description"
            value={newBadge.description}
            onChange={(e) => setNewBadge((p) => ({ ...p, description: e.target.value }))}
          />
          <button
            className="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
            onClick={() =>
              createBadge({
                name: newBadge.name,
                description: newBadge.description || undefined,
                iconUrl: newBadge.iconUrl || undefined,
              })
            }
          >
            Create
          </button>
        </div>
      </section>

      {/* === User Stats === */}
      <section>
        <h2 className="text-xl font-semibold mb-2">User Stats</h2>
        <ul className="space-y-1">
          {users.map((u) => {
            const s = statsFor[u.id]
            return (
              <li key={u.id} className="flex justify-between">
                <span>{u.name}</span>
                {s ? (
                  <span>
                    Bets: {s.totalBets}, Wins: {s.betsWon}, Profit: {s.profit}
                  </span>
                ) : (
                  <button
                    className="px-2 py-0.5 bg-[var(--color-tertiary)] text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
                    onClick={() => loadUserStats(u.id)}
                  >
                    Load
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export default AdminDashboard
