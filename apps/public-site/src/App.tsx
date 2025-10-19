import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import PredictionsPage from './components/PredictionsPage';
import LeaderboardPage from './components/LeaderboardPage';
import TimelinePage from './components/TimelinePage';
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
    };

  // Use pathname from serverData to ensure consistency
  const pathname = serverData.currentPath;
  const clientAppUrl = serverData.clientAppUrl;

  const renderPage = () => {
    switch (pathname) {
      case '/predictions':
        return <PredictionsPage {...serverData} />;
      case '/leaderboard':
        return <LeaderboardPage {...serverData} />;
      case '/timeline':
        return <TimelinePage {...serverData} />;
      default:
        return <LandingPage {...serverData} />;
    }
  };

  return (
    <Layout currentPath={pathname} clientAppUrl={clientAppUrl}>
      {renderPage()}
    </Layout>
  );
}

export default App;
