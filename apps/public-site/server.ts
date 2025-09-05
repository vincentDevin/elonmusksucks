import fs from 'node:fs/promises';
import express, { Request, Response } from 'express';
import { createServer as createViteServer, ViteDevServer } from 'vite';

const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;
const base = process.env.BASE || '/';

// Your existing server API base URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000';
// Client app URL for redirects
const CLIENT_APP_URL = process.env.CLIENT_APP_URL || 'http://127.0.0.1:3000';

// Import types
import type {
  ServerData,
  MarketOverview,
  TrendingPrediction,
  LeaderboardEntry,
  RecentActivity,
  TimelineArticle,
  TimelinePost,
} from './src/types/index.js';

// API client for server-side data fetching
async function fetchFromAPI(endpoint: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      console.warn(`API request failed: ${endpoint} - ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`API request error: ${endpoint}`, error.message);
    return null;
  }
}

// Cached template
let cachedTemplate: string;

interface CreateServerResult {
  app: express.Application;
  vite: ViteDevServer;
}

async function createServer(): Promise<CreateServerResult> {
  const app = express();

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base,
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  // Handle specific routes with proper path normalization
  app.use('*', async (req: Request, res: Response) => {
    try {
      const url = req.originalUrl.replace(base, '');
      let path = url.split('?')[0]; // Get path without query params

      // Normalize paths
      if (path === '' || path === '/') {
        path = '/';
      } else if (!path.startsWith('/')) {
        path = '/' + path;
      }

      console.log('SSR handling path:', path);

      let template: string;
      let render: (data: ServerData) => { html: string };
      if (!isProduction) {
        // Always read fresh template in dev
        template = await fs.readFile('./index.html', 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render;
      } else {
        template = cachedTemplate;
        render = (await import('./dist/server/entry-server.js')).render;
      }

      // Fetch data based on the route
      let marketData = null;
      let trendingData = null;
      let leaderboardData = null;
      let activityData = null;
      let timelineArticles = null;
      let timelinePosts = null;
      let predictionsData = null;
      let fullLeaderboardData = null;

      if (path === '/predictions') {
        // Fetch predictions page data
        predictionsData = await fetchFromAPI('/api/predictions?limit=50');
      } else if (path === '/leaderboard') {
        // Fetch full leaderboard data
        fullLeaderboardData = await fetchFromAPI('/api/leaderboard?limit=50');
      } else if (path === '/timeline') {
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

      // Debug logging
      console.log('API Data received:');
      console.log('- marketData:', marketData ? 'OK' : 'NULL');
      console.log(
        '- trendingData:',
        Array.isArray(trendingData) ? `Array(${trendingData.length})` : typeof trendingData,
      );
      console.log(
        '- leaderboardData:',
        Array.isArray(leaderboardData)
          ? `Array(${leaderboardData.length})`
          : typeof leaderboardData,
      );
      console.log('- activityData:', activityData ? 'Nested object' : 'NULL');
      console.log(
        '- processedActivityData:',
        Array.isArray(processedActivityData)
          ? `Array(${processedActivityData.length})`
          : typeof processedActivityData,
      );
      console.log('- timelineArticles:', timelineArticles ? 'Nested object' : 'NULL');
      console.log(
        '- processedArticlesData:',
        Array.isArray(processedArticlesData)
          ? `Array(${processedArticlesData.length})`
          : typeof processedArticlesData,
      );
      console.log('- timelinePosts:', timelinePosts ? 'Nested object' : 'NULL');
      console.log(
        '- processedPostsData:',
        Array.isArray(processedPostsData)
          ? `Array(${processedPostsData.length})`
          : typeof processedPostsData,
      );

      const serverData: ServerData = {
        marketData,
        trendingData,
        leaderboardData,
        activityData: processedActivityData,
        articlesData: processedArticlesData,
        postsData: processedPostsData,
        predictionsData,
        fullLeaderboardData,
        clientAppUrl: CLIENT_APP_URL,
        currentPath: path,
      };

      const { html } = render(serverData);

      const finalHtml = template.replace('<!--app-html-->', html).replace(
        '<script type="module" src="/src/entry-client.tsx"></script>',
        `<script>
          // Initialize theme before any rendering to prevent flash
          (function() {
            const stored = localStorage.getItem('theme');
            const theme = stored || 'dark';
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            }
            if (!stored) {
              localStorage.setItem('theme', 'dark');
            }
          })();
          window.__SERVER_DATA__ = ${JSON.stringify(serverData, null, 2)};
        </script>
        <script type="module" src="/src/entry-client.tsx"></script>`,
      );

      res.status(200).set({ 'Content-Type': 'text/html' }).send(finalHtml);
    } catch (e) {
      vite?.ssrFixStacktrace(e);
      console.log(e.stack);
      res.status(500).end(e.stack);
    }
  });

  return { app, vite };
}

if (!isProduction) {
  createServer().then(({ app }) => {
    app.listen(port, '127.0.0.1', () => {
      console.log(`🚀 Public SSR site running at http://127.0.0.1:${port}`);
    });
  });
} else {
  // Production
  cachedTemplate = await fs.readFile('./dist/client/index.html', 'utf-8');
  createServer().then(({ app }) => {
    app.use(express.static('./dist/client'));
    app.listen(port, '127.0.0.1', () => {
      console.log(`🚀 Public SSR site (production) running at http://127.0.0.1:${port}`);
    });
  });
}
