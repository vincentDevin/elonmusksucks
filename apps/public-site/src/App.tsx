import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import PredictionsPage from './components/PredictionsPage';
import LeaderboardPage from './components/LeaderboardPage';
import TimelinePage from './components/TimelinePage';
import type { ServerData } from './types';

interface AppProps {
  serverData?: ServerData;
}

function App({ serverData: propServerData }: AppProps) {
  // Get server data - prioritize server data, then window data, then fallback
  const serverData: ServerData = propServerData ||
    (typeof window !== 'undefined' && (window as any).__SERVER_DATA__) || {
      // Fallback mock data (should rarely be used)
      marketData: {
        totalVolume: 12345678,
        activeMarkets: 8934,
        totalUsers: 15420,
        volumeChange: 5.2,
        trending: [],
      },
      trendingData: null,
      leaderboardData: null,
      activityData: null,
      articlesData: null,
      postsData: null,
      predictionsData: null,
      fullLeaderboardData: null,
      clientAppUrl: 'http://127.0.0.1:3000',
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
