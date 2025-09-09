import React from 'react';
import LandingPage from './components/LandingPage';
import PredictionsPage from './components/PredictionsPage';
import LeaderboardPage from './components/LeaderboardPage';
import TimelinePage from './components/TimelinePage';
import type { ServerData } from './types';

function App(props: ServerData) {
  const { currentPath } = props;

  // Route to appropriate page based on path
  switch (currentPath) {
    case '/predictions':
      return <PredictionsPage {...props} />;
    case '/leaderboard':
      return <LeaderboardPage {...props} />;
    case '/timeline':
      return <TimelinePage {...props} />;
    default:
      return <LandingPage {...props} />;
  }
}

export default App;
