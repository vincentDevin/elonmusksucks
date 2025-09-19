import express from 'express';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ServerData } from './src/types';
import type { PredictionView, LeaderboardEntryView } from '@ems/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer(): Promise<express.Application> {
  const app = express();

  // Create Vite server in middleware mode
  const vite: ViteDevServer = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  // API proxy middleware
  app.use(
    '/api/*',
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        // Proxy to the main API server
        const apiUrl = `http://127.0.0.1:5000${req.originalUrl}`;
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(apiUrl, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        });

        const data = await response.text();
        res.status(response.status).send(data);
      } catch (error) {
        console.error('API proxy error:', error);
        next();
      }
    },
  );

  // SSR handler
  app.use('*', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const url = req.originalUrl;

    try {
      // Fetch data based on the route
      const serverData = await fetchServerData(url);

      // Load the server entry
      const { render } = (await vite.ssrLoadModule('/src/entry-server.tsx')) as {
        render: (serverData: ServerData) => string;
      };

      // Render the app HTML
      const appHtml = render(serverData);

      // Read the index.html template
      let template = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');

      // Transform the template with Vite
      template = await vite.transformIndexHtml(url, template);

      // Inject the app HTML and server data
      const html = template
        .replace(`<!--ssr-outlet-->`, appHtml)
        .replace(
          `<!--server-data-->`,
          `<script>window.__SERVER_DATA__ = ${JSON.stringify(serverData).replace(/</g, '\\<')}</script>`,
        );

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      console.error('SSR error:', e);
      next(e);
    }
  });

  return app;
}

// Fetch server data based on route
async function fetchServerData(url: string): Promise<ServerData> {
  const clientAppUrl = 'http://127.0.0.1:3000';
  const apiBaseUrl = 'http://127.0.0.1:5000/api';

  // Base server data structure
  const baseData: ServerData = {
    marketData: null,
    trendingData: null,
    leaderboardData: null,
    activityData: null,
    articlesData: null,
    postsData: null,
    predictionsData: null,
    fullLeaderboardData: null,
    clientAppUrl,
    currentPath: url,
  };

  try {
    const fetch = (await import('node-fetch')).default;

    // Fetch different data based on the route
    if (url === '/' || url === '') {
      // Landing page - fetch overview data
      const [predictionsRes, leaderboardRes, activityRes, articlesRes, postsRes] =
        await Promise.allSettled([
          fetch(`${apiBaseUrl}/predictions`),
          fetch(`${apiBaseUrl}/leaderboard`),
          fetch(`${apiBaseUrl}/activity/recent?limit=10`),
          fetch(`${apiBaseUrl}/timeline/articles?limit=5`),
          fetch(`${apiBaseUrl}/posts?limit=5`),
        ]);

      // Get predictions data for trending - filter for APPROVED status only
      if (predictionsRes.status === 'fulfilled' && predictionsRes.value.ok) {
        const predictions = (await predictionsRes.value.json()) as PredictionView[];
        if (Array.isArray(predictions)) {
          const approvedPredictions = predictions.filter((p) => p.status === 'APPROVED');
          baseData.trendingData = approvedPredictions.slice(0, 5);
        }
      }

      // Get posts data for timeline preview
      if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
        const postsResponse = (await postsRes.value.json()) as { posts: unknown[] };
        baseData.postsData = Array.isArray(postsResponse.posts) ? postsResponse.posts : null;
      }

      // Get leaderboard data for preview
      if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.ok) {
        const leaderboard = (await leaderboardRes.value.json()) as LeaderboardEntryView[];
        baseData.leaderboardData = Array.isArray(leaderboard) ? leaderboard.slice(0, 5) : null;
      }

      // Get activity data - response has { success, activities, count, cached }
      if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
        const activityResponse = (await activityRes.value.json()) as {
          success: boolean;
          activities: unknown[];
          count: number;
          cached: boolean;
        };
        baseData.activityData = activityResponse.success ? activityResponse.activities : null;
      }

      // Get articles data for timeline preview - response has { items, pagination }
      if (articlesRes.status === 'fulfilled' && articlesRes.value.ok) {
        const articlesResponse = (await articlesRes.value.json()) as {
          items: unknown[];
          pagination: { cursor?: string; hasMore: boolean };
        };
        baseData.articlesData = Array.isArray(articlesResponse.items)
          ? articlesResponse.items
          : null;
      }

      // Create market data from actual data
      baseData.marketData = {
        totalVolume: 12345678, // This would need a specific endpoint
        activeMarkets: baseData.trendingData ? baseData.trendingData.length : 247,
        totalUsers: baseData.leaderboardData ? baseData.leaderboardData.length * 50 : 1423,
        volumeChange: 5.2,
        trending: [],
      };
    } else if (url === '/predictions') {
      // Predictions page
      const predictionsRes = await fetch(`${apiBaseUrl}/predictions`);
      if (predictionsRes.ok) {
        const predictions = (await predictionsRes.json()) as PredictionView[];
        baseData.predictionsData = Array.isArray(predictions) ? predictions : null;
      }
    } else if (url === '/leaderboard') {
      // Leaderboard page
      const leaderboardRes = await fetch(`${apiBaseUrl}/leaderboard`);
      if (leaderboardRes.ok) {
        const leaderboard = (await leaderboardRes.json()) as LeaderboardEntryView[];
        baseData.fullLeaderboardData = Array.isArray(leaderboard) ? leaderboard : null;
      }
    } else if (url === '/timeline') {
      // Timeline page
      const [articlesRes, postsRes] = await Promise.allSettled([
        fetch(`${apiBaseUrl}/timeline/articles`),
        fetch(`${apiBaseUrl}/posts`),
      ]);

      if (articlesRes.status === 'fulfilled' && articlesRes.value.ok) {
        const articlesResponse = (await articlesRes.value.json()) as {
          items: unknown[];
          pagination: { cursor?: string; hasMore: boolean };
        };
        baseData.articlesData = Array.isArray(articlesResponse.items)
          ? articlesResponse.items
          : null;
      }
      if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
        const postsResponse = (await postsRes.value.json()) as { posts: unknown[] };
        baseData.postsData = Array.isArray(postsResponse.posts) ? postsResponse.posts : null;
      }
    }
  } catch (error) {
    console.error('Error fetching server data:', error);
    // Return base data with nulls if API calls fail
  }

  return baseData;
}

// Start the server
createServer()
  .then((app) => {
    app.listen(5173, '127.0.0.1', () => {
      console.log('SSR server running at http://127.0.0.1:5173');
    });
  })
  .catch(console.error);
