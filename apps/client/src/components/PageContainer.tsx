import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageContainer provides consistent page-level layout with container constraints,
 * horizontal margins, and bottom padding for the chat widget.
 *
 * Use this for pages that need constrained width and standard padding:
 * - Profile, Leaderboard, Pong, Login, Register, etc.
 *
 * Do NOT use for full-width pages:
 * - Timeline, Predictions (these handle their own layout)
 */
export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return <div className={`container mx-auto px-4 py-6 pb-32 ${className}`}>{children}</div>;
}
