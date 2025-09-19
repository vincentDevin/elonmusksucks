import { useState, useEffect } from 'react';
import axios from 'axios';
import type { ServerData } from '../public/types';

// API base URL - same as what the SSR server was using
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

async function fetchFromAPI(endpoint: string): Promise<any> {
  try {
    const response = await axios.get(`${API_BASE_URL}${endpoint}`);
    return response.data;
  } catch (error) {
    console.warn(`API request failed: ${endpoint}`, error);
    return null;
  }
}

export function usePublicData(currentPath: string): ServerData {
  const [data, setData] = useState<ServerData>({
    marketData: null,
    trendingData: null,
    leaderboardData: null,
    activityData: null,
    articlesData: null,
    postsData: null,
    predictionsData: null,
    fullLeaderboardData: null,
    clientAppUrl: '',
    currentPath,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      let marketData = null;
      let trendingData = null;
      let leaderboardData = null;
      let activityData = null;
      let timelineArticles = null;
      let timelinePosts = null;
      let predictionsData = null;
      let fullLeaderboardData = null;

      if (currentPath === '/predictions') {
        // Fetch predictions page data
        predictionsData = await fetchFromAPI('/api/predictions?limit=50');
      } else if (currentPath === '/leaderboard') {
        // Fetch full leaderboard data
        fullLeaderboardData = await fetchFromAPI('/api/leaderboard?limit=50');
      } else if (currentPath === '/timeline') {
        // Fetch timeline data (articles and posts)
        const results = await Promise.all([
          fetchFromAPI('/api/timeline/articles?limit=20'),
          fetchFromAPI('/api/posts?limit=20'),
        ]);
        timelineArticles = results[0];
        timelinePosts = results[1];
      } else {
        // Home page - fetch all preview data
        const results = await Promise.all([
          fetchFromAPI('/api/market/overview'),
          fetchFromAPI('/api/market/trending?limit=5'),
          fetchFromAPI('/api/leaderboard?limit=5'),
          fetchFromAPI('/api/activity/recent?limit=6'),
          fetchFromAPI('/api/timeline/articles?limit=6'),
          fetchFromAPI('/api/posts?limit=6'),
        ]);
        marketData = results[0];
        trendingData = results[1];
        leaderboardData = results[2];
        activityData = results[3];
        timelineArticles = results[4];
        timelinePosts = results[5];
      }

      // Extract activities array from nested response
      const processedActivityData =
        activityData?.activities && Array.isArray(activityData.activities)
          ? activityData.activities
          : null;

      // Extract articles array from nested response
      const processedArticlesData =
        timelineArticles?.items && Array.isArray(timelineArticles.items)
          ? timelineArticles.items
          : null;

      // Extract posts array from nested response
      const processedPostsData =
        timelinePosts?.posts && Array.isArray(timelinePosts.posts) ? timelinePosts.posts : null;

      setData({
        marketData,
        trendingData,
        leaderboardData,
        activityData: processedActivityData,
        articlesData: processedArticlesData,
        postsData: processedPostsData,
        predictionsData,
        fullLeaderboardData,
        clientAppUrl: '',
        currentPath,
      });

      setLoading(false);
    }

    loadData();
  }, [currentPath]);

  return { ...data, loading };
}
