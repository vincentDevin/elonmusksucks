import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import type { PublicUser, PublicBadge } from '@ems/types';

const UserManagement: React.FC = () => {
  const {
    users,
    badges,
    updateUserRole,
    activateUser,
    updateUserBalance,
    assignBadge,
    revokeBadge,
  } = useAdmin();
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [selectedAssign, setSelectedAssign] = useState<Record<number, number>>({});
  const [selectedRevoke, setSelectedRevoke] = useState<Record<number, number>>({});

  useEffect(() => {
    const map: Record<number, number> = {};
    users.forEach((u: PublicUser) => {
      map[u.id] = u.muskBucks;
    });
    setBalances(map);
  }, [users]);

  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">User Management</h2>
      <table className="w-full bg-[var(--color-surface)] border border-[var(--color-muted)]">
        <thead className="bg-[var(--color-secondary)]">
          <tr>
            {['ID', 'Name', 'Email', 'Role', 'Active', 'Balance', 'Badges'].map((h) => (
              <th key={h} className="border border-[var(--color-muted)] px-2 py-1">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u: PublicUser) => (
            <tr key={u.id} className="even:bg-[var(--color-muted)] odd:bg-[var(--color-surface)]">
              <td className="border px-2 py-1">{u.id}</td>
              <td className="border px-2 py-1">{u.name}</td>
              <td className="border px-2 py-1">{u.email}</td>
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
              <td className="border px-2 py-1 text-center">
                <input
                  type="checkbox"
                  checked={(u as any).active}
                  onChange={(e) => activateUser(u.id, e.target.checked)}
                  className="cursor-pointer"
                />
              </td>
              <td className="border px-2 py-1">
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    className="w-20 border px-1 py-1 bg-[var(--color-surface)]"
                    value={balances[u.id] ?? u.muskBucks}
                    onChange={(e) => setBalances((b) => ({ ...b, [u.id]: Number(e.target.value) }))}
                  />
                  <button
                    className="px-2 py-1 bg-[var(--color-primary)] text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
                    onClick={() => updateUserBalance(u.id, balances[u.id] ?? u.muskBucks)}
                  >
                    Set
                  </button>
                </div>
              </td>
              <td className="border px-2 py-1">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedAssign[u.id] ?? ''}
                      onChange={(e) =>
                        setSelectedAssign((p) => ({ ...p, [u.id]: Number(e.target.value) }))
                      }
                      className="border px-1 py-1 bg-[var(--color-surface)] cursor-pointer transition"
                    >
                      <option value="">— assign badge —</option>
                      {badges.map((b: PublicBadge) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="px-2 py-1 bg-[var(--color-primary)] text-[var(--color-surface)] rounded disabled:opacity-50 cursor-pointer hover:opacity-90 transition"
                      disabled={!selectedAssign[u.id]}
                      onClick={() => {
                        assignBadge(u.id, selectedAssign[u.id]);
                        setSelectedAssign((p) => ({ ...p, [u.id]: 0 }));
                      }}
                    >
                      Assign
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedRevoke[u.id] ?? ''}
                      onChange={(e) =>
                        setSelectedRevoke((p) => ({ ...p, [u.id]: Number(e.target.value) }))
                      }
                      className="border px-1 py-1 bg-[var(--color-surface)] cursor-pointer transition"
                    >
                      <option value="">— revoke badge —</option>
                      {badges.map((b: PublicBadge) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="px-2 py-1 bg-red-600 text-[var(--color-surface)] rounded disabled:opacity-50 cursor-pointer hover:opacity-90 transition"
                      disabled={!selectedRevoke[u.id]}
                      onClick={() => {
                        revokeBadge(u.id, selectedRevoke[u.id]);
                        setSelectedRevoke((p) => ({ ...p, [u.id]: 0 }));
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
);
};

export default UserManagement;