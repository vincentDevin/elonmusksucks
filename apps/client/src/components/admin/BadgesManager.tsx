// File: apps/client/src/components/admin/BadgesManager.tsx
import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import type { PublicBadge } from '@ems/types';

const BadgesManager: React.FC = () => {
  const { badges, createBadge } = useAdmin();
  const [newBadge, setNewBadge] = useState({
    name: '',
    description: '',
    iconUrl: '',
  });

  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">Badges</h2>

      {/* List existing badges */}
      {badges.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {badges.map((b: PublicBadge) => (
            <li
              key={b.id}
              className="flex items-center space-x-2 border p-2 rounded bg-[var(--color-surface)]"
            >
              {b.iconUrl && (
                <img
                  src={b.iconUrl}
                  alt={b.name}
                  className="h-6 w-6 rounded-full"
                />
              )}
              <div>
                <span className="font-medium">{b.name}</span>
                {b.description && (
                  <p className="text-sm text-[var(--color-tertiary)]">
                    {b.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-[var(--color-tertiary)]">No badges found.</p>
      )}

      {/* Create new badge form */}
      <div className="flex space-x-2">
        <input
          className="border border-[var(--color-muted)] px-2 py-1 flex-1 bg-[var(--color-surface)]"
          placeholder="Name"
          value={newBadge.name}
          onChange={(e) =>
            setNewBadge((p) => ({ ...p, name: e.target.value }))
          }
        />
        <input
          className="border border-[var(--color-muted)] px-2 py-1 flex-1 bg-[var(--color-surface)]"
          placeholder="Description"
          value={newBadge.description}
          onChange={(e) =>
            setNewBadge((p) => ({ ...p, description: e.target.value }))
          }
        />
        <input
          className="border border-[var(--color-muted)] px-2 py-1 flex-1 bg-[var(--color-surface)]"
          placeholder="Icon URL"
          value={newBadge.iconUrl}
          onChange={(e) =>
            setNewBadge((p) => ({ ...p, iconUrl: e.target.value }))
          }
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
  );
};

export default BadgesManager;
