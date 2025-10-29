import LandingPage from './components/LandingPage';
import NotFound from './components/NotFound';
import type {
  PredictionView,
  LeaderboardEntryView,
  UnifiedActivityEvent,
  PongLeaderboardView,
  PublicArticle,
  PublicPostView,
} from '@ems/types';

// ServerData interface - matches server.ts
interface ServerData {
  trendingData: PredictionView[] | null;
  leaderboardData: LeaderboardEntryView[] | null;
  pongLeaderboardData: PongLeaderboardView[] | null;
  activityData: UnifiedActivityEvent[] | null;
  articlesData: PublicArticle[] | null;
  postsData: PublicPostView[] | null;
  predictionsData: PredictionView[] | null;
  fullLeaderboardData: LeaderboardEntryView[] | null;
  clientAppUrl: string;
  currentPath: string;
  is404?: boolean;
}

interface AppProps {
  serverData?: ServerData;
}

function App({ serverData: propServerData }: AppProps) {
  // Get server data - prioritize server data, then window data, then minimal fallback
  const serverData: ServerData = propServerData ||
    (typeof window !== 'undefined' && (window as any).__SERVER_DATA__) || {
      // Minimal fallback (only if SSR completely fails)
      trendingData: null,
      leaderboardData: null,
      pongLeaderboardData: null,
      activityData: null,
      articlesData: null,
      postsData: null,
      predictionsData: null,
      fullLeaderboardData: null,
      clientAppUrl: '',
      currentPath: '/',
      is404: false,
    };

  // Render 404 page if server indicates unknown route
  if (serverData.is404) {
    return <NotFound clientAppUrl={serverData.clientAppUrl} />;
  }

  // Otherwise render landing page
  return <LandingPage {...serverData} />;
}

export default App;
