export function ProfileBadges({ badges }: { badges: any[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Badges</h2>
      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className="flex items-center space-x-2 bg-surface p-2 rounded-lg shadow-sm"
            >
              {b.iconUrl && <img src={b.iconUrl} alt={b.name} className="w-6 h-6" />}
              <div>
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-gray-500">
                  Awarded {new Date(b.awardedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500">No badges yet.</div>
      )}
    </div>
  );
}
