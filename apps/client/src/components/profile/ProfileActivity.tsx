// apps/client/src/components/profile/ProfileActivity.tsx
import type { UserActivity } from '@ems/types';
import {
  ChatBubbleOvalLeftEllipsisIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/solid';

type ProfileActivityProps = {
  activity: UserActivity[];
  loading?: boolean;
};

export function ProfileActivity({ activity, loading }: ProfileActivityProps) {
  if (loading) return <div>Loading recent activity…</div>;
  if (!activity?.length) return <div className="text-gray-500">No recent activity.</div>;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" />
        Recent Activity
      </h2>
      <div className="flex flex-col gap-3">
        {activity.map((act) => (
          <ActivityCard key={act.id} act={act} />
        ))}
      </div>
    </section>
  );
}

function ActivityCard({ act }: { act: UserActivity }) {
  const details = getDetails(act.details);
  const { icon, text, color } = getActivityInfo(act, details);

  return (
    <div
      className={`flex items-start gap-3 rounded-xl bg-white/90 dark:bg-surface shadow p-4 border border-gray-100 dark:border-gray-800`}
    >
      <div className={`flex-shrink-0 mt-1`}>
        <span className={`inline-flex p-2 rounded-full ${color}`}>{icon}</span>
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{text}</div>
        <div className="text-xs text-gray-500 mt-1">{new Date(act.createdAt).toLocaleString()}</div>
      </div>
    </div>
  );
}

function getActivityInfo(act: UserActivity, details: any) {
  switch (act.type) {
    case 'BET_PLACED':
      return {
        icon: <CurrencyDollarIcon className="w-5 h-5" />,
        text: `Placed a bet${details.predictionId ? ` on prediction #${details.predictionId}` : ''}.`,
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      };
    case 'PARLAY_PLACED':
      return {
        icon: <TrophyIcon className="w-5 h-5" />,
        text: `Started a parlay${details.parlayId ? ` (Parlay #${details.parlayId})` : ''}.`,
        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      };
    case 'POST_CREATED':
      return {
        icon: <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" />,
        text: `Posted on their profile.`,
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      };
    case 'COMMENT_CREATED':
      return {
        icon: <ChatBubbleLeftIcon className="w-5 h-5" />,
        text: `Commented on a post.`,
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      };
    case 'PREDICTION_CREATED':
      return {
        icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
        text: `Created a prediction${details.title ? `: "${details.title}"` : ''}`,
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      };
    default:
      return {
        icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
        text: act.type,
        color: 'bg-gray-200 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300',
      };
  }
}

function getDetails<T = Record<string, any>>(details: unknown): T {
  return details && typeof details === 'object' ? (details as T) : ({} as T);
}
