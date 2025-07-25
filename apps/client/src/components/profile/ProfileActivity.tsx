// apps/client/src/components/profile/ProfileActivity.tsx
import { useState } from 'react';
import type { UserActivity } from '@ems/types';
import {
  ChatBubbleOvalLeftEllipsisIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/solid';

type ProfileActivityProps = {
  activity: UserActivity[];
  loading?: boolean;
};

export function ProfileActivity({ activity, loading }: ProfileActivityProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (loading) return <div>Loading recent activity…</div>;
  if (!activity?.length) return <div className="text-gray-500">No recent activity.</div>;

  const recentActivity = activity.slice(0, 5);

  return (
    <section>
      <h2
        className="text-lg font-semibold mb-3 flex items-center gap-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" />
        Recent Activity
        <ChevronDownIcon
          className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </h2>
      {isOpen && (
        <div className="flex flex-wrap gap-2">
          {recentActivity.map((act) => (
            <ActivityBubble key={act.id} act={act} />
          ))}
        </div>
      )}
    </section>
  );
}

function ActivityBubble({ act }: { act: UserActivity }) {
  const details = getDetails(act.details);
  const { icon, text, color } = getActivityInfo(act, details);

  return (
    <div
      className={`flex items-center gap-2 rounded-full bg-white/90 dark:bg-surface shadow px-3 py-1 border border-gray-100 dark:border-gray-800`}
    >
      <div className={`flex-shrink-0`}>
        <span className={`inline-flex p-1 rounded-full ${color}`}>{icon}</span>
      </div>
      <div className="flex-1">
        <div className="text-xs font-medium">{text}</div>
      </div>
    </div>
  );
}

function getActivityInfo(act: UserActivity, details: any) {
  switch (act.type) {
    case 'BET_PLACED':
      return {
        icon: <CurrencyDollarIcon className="w-4 h-4" />,
        text: `Bet ${details.amount} on "${details.predictionTitle}"`,
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      };
    case 'PARLAY_PLACED':
      return {
        icon: <TrophyIcon className="w-4 h-4" />,
        text: `Parlay of ${details.numLegs} for ${details.amount}`,
        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      };
    case 'POST_CREATED':
      return {
        icon: <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" />,
        text: `Posted on their wall`,
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      };
    case 'COMMENT_CREATED':
      return {
        icon: <ChatBubbleLeftIcon className="w-4 h-4" />,
        text: `Commented on a post`,
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      };
    case 'PREDICTION_CREATED':
      return {
        icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
        text: `Created prediction: "${details.title}"`,
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      };
    default:
      return {
        icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
        text: act.type,
        color: 'bg-gray-200 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300',
      };
  }
}

function getDetails<T = Record<string, any>>(details: unknown): T {
  return details && typeof details === 'object' ? (details as T) : ({} as T);
}
