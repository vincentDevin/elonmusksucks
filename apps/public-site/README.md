# Public Site - Vite SSR Marketing Site

**Server-side rendered (SSR) React 19 marketing site** optimized for SEO, performance, and public accessibility. Serves as the public-facing landing page and preview for the elonmusksucks.net platform.

## Table of Contents

- [Overview](#overview)
- [SSR Architecture](#ssr-architecture)
- [Technology Stack](#technology-stack)
- [Directory Structure](#directory-structure)
- [SSR Request Flow](#ssr-request-flow)
- [Entry Points](#entry-points)
- [Data Fetching](#data-fetching)
- [Components](#components)
- [Theme System](#theme-system)
- [SEO Optimization](#seo-optimization)
- [Security](#security)
- [Development](#development)
- [Build & Deployment](#build--deployment)
- [Performance Optimizations](#performance-optimizations)
- [Troubleshooting](#troubleshooting)

---

## Overview

The **public-site** is a server-side rendered (SSR) React application that provides:

- **Landing page** with platform preview
- **Public predictions** (no authentication required)
- **Public leaderboards** (top 10 users)
- **Public timeline** (articles & posts)
- **SEO-optimized** content for search engines
- **Fast initial page load** (pre-rendered HTML)
- **No authentication** required

**Key Features:**

- Server-side rendering with Vite SSR
- Automatic hydration with React 19
- Shared theme system with client app
- Security headers (Helmet, CSP)
- IP banning & rate limiting
- Redis-backed caching

**Purpose:**

- Drive user acquisition through SEO
- Showcase platform activity (predictions, leaderboards)
- Provide preview without requiring login
- Redirect to client app for authenticated features

---

## SSR Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Client Browser                               │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             │ HTTP GET /
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Express Server (Port 5173)                       │
├──────────────────────────────────────────────────────────────────────┤
│  1. Middleware Pipeline                                               │
│     ├─ Security (Helmet, CORS, Rate Limiting)                        │
│     ├─ IP Banning (Redis-backed)                                     │
│     └─ Static Assets (sirv in production)                            │
├──────────────────────────────────────────────────────────────────────┤
│  2. Data Fetching Layer                                               │
│     ├─ Fetch trending predictions from API                           │
│     ├─ Fetch leaderboard data                                        │
│     ├─ Fetch articles & posts                                        │
│     └─ Assemble ServerData object                                    │
├──────────────────────────────────────────────────────────────────────┤
│  3. React SSR Rendering                                               │
│     ├─ Import entry-server.tsx                                       │
│     ├─ Call renderToString(<App serverData={data} />)                │
│     └─ Generate HTML string                                          │
├──────────────────────────────────────────────────────────────────────┤
│  4. HTML Template Injection                                           │
│     ├─ Inject rendered HTML into <div id="root">                     │
│     ├─ Inject serverData into <script>window.__SERVER_DATA__</script>│
│     ├─ Inject theme CSS variables                                    │
│     └─ Inject SEO meta tags                                          │
├──────────────────────────────────────────────────────────────────────┤
│  5. Send HTML Response                                                │
│     └─ Send complete HTML document to browser                        │
└──────────────────────────────────────────────────────────────────────┘
                             │
                             │ HTML + embedded data
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          Client Browser                               │
├──────────────────────────────────────────────────────────────────────┤
│  1. Parse HTML (instant visual content)                               │
│  2. Download entry-client.js bundle                                   │
│  3. Execute hydration (hydrateRoot)                                   │
│  4. Attach event listeners                                            │
│  5. Make interactive                                                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Why SSR?

**Benefits over Client-Side Rendering (CSR):**

| Metric                           | SSR (Public Site)                  | CSR (Client App)               |
| -------------------------------- | ---------------------------------- | ------------------------------ |
| **Initial Load**                 | ~200ms (HTML ready)                | ~1000ms (fetch + render)       |
| **SEO**                          | ✅ Crawlable HTML                  | ❌ Requires JS execution       |
| **Time to Interactive (TTI)**    | ~500ms                             | ~1500ms                        |
| **First Contentful Paint (FCP)** | ~200ms                             | ~800ms                         |
| **Server Load**                  | Higher (rendering on server)       | Lower (client-side only)       |
| **Best For**                     | Public content, SEO, landing pages | Authenticated apps, dashboards |

**Trade-offs:**

- ✅ **SEO**: Search engines get fully rendered HTML
- ✅ **Performance**: Faster initial page load (pre-rendered)
- ✅ **Accessibility**: Works without JavaScript
- ❌ **Server Cost**: More CPU/memory usage on server
- ❌ **Complexity**: SSR + client hydration requires careful state management

---

## Technology Stack

### Core Runtime

- **Node.js ≥24.0.0** - Strict requirement
- **Express 5.1.0** - Web server
- **TypeScript 5.8.3** - Type safety

### React SSR

- **React 19.1.0** - SSR with `renderToString` / `hydrateRoot`
- **React DOM 19.1.0** - Server & client rendering
- **Vite 7.1.9** - SSR bundler with HMR
- **@vitejs/plugin-react 5.0.4** - React plugin for Vite

### Styling

- **TailwindCSS 3.4.16** - Utility-first CSS (shared with client app)
- **PostCSS 8.5.4** - CSS processing
- **Autoprefixer 10.4.21** - Vendor prefixes

### Security & Performance

- **Helmet 7.2.0** - Security headers
- **cors 2.8.5** - CORS configuration
- **express-rate-limit 7.5.1** - Rate limiting
- **IORedis 5.8.2** - Redis client (IP banning, caching)
- **prom-client 15.1.3** - Prometheus metrics
- **morgan 1.10.1** - HTTP request logging
- **sirv 3.0.0** - Static file server (production)

### Development Tools

- **tsx 4.19.2** - TypeScript execution
- **nodemon** (inherited from root) - Hot reload

---

## Directory Structure

```
apps/public-site/
├── src/
│   ├── components/              # React components
│   │   ├── LandingPage.tsx      # Main landing page
│   │   ├── NotFound.tsx         # 404 page
│   │   ├── ThemeToggle.tsx      # Dark/light mode toggle
│   │   └── MaintenancePage.tsx  # Maintenance mode page
│   │
│   ├── config/                  # Configuration
│   │   └── env.ts               # Environment variable validation
│   │
│   ├── middleware/              # Express middleware
│   │   └── ipBanning.ts         # IP banning service
│   │
│   ├── entry-server.tsx         # SSR entry point (server-side)
│   ├── entry-client.tsx         # Client entry point (hydration)
│   ├── App.tsx                  # Root app component
│   ├── index.css                # Global styles (TailwindCSS)
│   └── vite-env.d.ts            # Vite type definitions
│
├── public/                      # Static assets
│   ├── favicon.ico              # Favicon
│   ├── robots.txt               # SEO robots file
│   ├── sitemap.xml              # SEO sitemap
│   └── manifest.json            # PWA manifest
│
├── dist/                        # Build output (gitignored)
│   ├── server/                  # SSR bundle
│   │   └── entry-server.js      # Server-side rendering entry
│   └── client/                  # Client bundle
│       ├── index.html           # HTML template
│       └── assets/              # Hashed JS/CSS files
│
├── server.ts                    # Express SSR server
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # TailwindCSS configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies & scripts
├── Dockerfile                   # Production Docker build
└── fly.toml                     # Fly.io deployment config
```

---

## SSR Request Flow

### Server-Side (First Request)

```typescript
// server.ts - Simplified flow

1. Client requests: GET /
   ↓
2. Express middleware pipeline:
   - Security headers (Helmet)
   - CORS validation
   - Rate limiting
   - IP banning check
   ↓
3. Fetch data from API server:
   const trendingData = await fetch('http://server:5000/api/predictions/trending');
   const leaderboardData = await fetch('http://server:5000/api/leaderboard/daily?limit=10');
   const articlesData = await fetch('http://server:5000/api/timeline/articles?limit=5');
   ↓
4. Assemble ServerData object:
   const serverData = {
     trendingData,
     leaderboardData,
     articlesData,
     clientAppUrl: env.CLIENT_APP_URL,
     currentPath: req.path,
     is404: false
   };
   ↓
5. Render React to HTML string:
   import { render } from './dist/server/entry-server.js';
   const appHtml = render(serverData);
   ↓
6. Inject into HTML template:
   const html = template
     .replace('<!--app-html-->', appHtml)
     .replace('<!--server-data-->', `<script>window.__SERVER_DATA__=${serializeForHTML(serverData)}</script>`);
   ↓
7. Send response:
   res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
```

---

### Client-Side (Hydration)

```typescript
// entry-client.tsx - Simplified flow

1. Browser receives HTML (instant visual content)
   ↓
2. Parse HTML, display pre-rendered content
   ↓
3. Download entry-client.js bundle (~50KB gzipped)
   ↓
4. Execute JavaScript:
   import { hydrateRoot } from 'react-dom/client';
   import App from './App';
   ↓
5. Hydrate React (attach event listeners):
   const root = document.getElementById('root');
   hydrateRoot(root, <App />);
   ↓
6. Read server data from window:
   const serverData = window.__SERVER_DATA__;
   ↓
7. Make interactive (buttons, links work)
   ↓
8. Remove loading overlay
```

**Key Point:** User sees content immediately (step 2), but interactivity comes after hydration (step 7).

---

## Entry Points

### 1. Server Entry (`src/entry-server.tsx`)

**Purpose:** Render React to HTML string on the server.

```typescript
// entry-server.tsx
import { renderToString } from 'react-dom/server';
import App from './App';

export function render(serverData: any) {
  const html = renderToString(<App serverData={serverData} />);
  return html;
}
```

**Used by:** `server.ts` to generate HTML

**Output:** HTML string (e.g., `<div class="landing-page">...</div>`)

---

### 2. Client Entry (`src/entry-client.tsx`)

**Purpose:** Hydrate pre-rendered HTML on the client.

```typescript
// entry-client.tsx
import { hydrateRoot } from 'react-dom/client';
import App from './App';

async function initializeApp() {
  const root = document.getElementById('root');

  // Hydrate (attach event listeners to existing HTML)
  hydrateRoot(root, <App />);

  // Fade out loading overlay
  document.getElementById('loading-overlay')?.remove();
}

initializeApp();
```

**Used by:** Browser to make pre-rendered HTML interactive

**Key Features:**

- Loading animation (fade out after hydration)
- Force show timeout (5s max to prevent infinite loading)
- Graceful error handling (show content even if hydration fails)

---

### 3. App Component (`src/App.tsx`)

**Purpose:** Root component that receives server data.

```typescript
// App.tsx
interface ServerData {
  trendingData: PredictionView[] | null;
  leaderboardData: LeaderboardEntryView[] | null;
  articlesData: PublicArticle[] | null;
  clientAppUrl: string;
  currentPath: string;
  is404?: boolean;
}

function App({ serverData: propServerData }: { serverData?: ServerData }) {
  // Get server data (SSR prop or window.__SERVER_DATA__)
  const serverData = propServerData || window.__SERVER_DATA__ || fallback;

  // Render 404 or landing page
  if (serverData.is404) {
    return <NotFound clientAppUrl={serverData.clientAppUrl} />;
  }

  return <LandingPage {...serverData} />;
}
```

**Key Features:**

- **Server-side:** Receives data via props
- **Client-side:** Reads data from `window.__SERVER_DATA__`
- **Fallback:** Minimal fallback if SSR fails

---

## Data Fetching

### Server-Side Data Fetching

**Pattern:**

```typescript
// server.ts
async function fetchServerData(req: Request): Promise<ServerData> {
  const apiBaseUrl = env.API_BASE_URL || 'http://localhost:5000';

  // Parallel data fetching
  const [trendingRes, leaderboardRes, articlesRes] = await Promise.allSettled([
    fetch(`${apiBaseUrl}/api/predictions/trending?limit=6`),
    fetch(`${apiBaseUrl}/api/leaderboard/daily?limit=10`),
    fetch(`${apiBaseUrl}/api/timeline/articles?limit=5`),
  ]);

  // Extract data (handle errors gracefully)
  const trendingData = trendingRes.status === 'fulfilled' ? await trendingRes.value.json() : null;

  const leaderboardData =
    leaderboardRes.status === 'fulfilled' ? await leaderboardRes.value.json() : null;

  const articlesData = articlesRes.status === 'fulfilled' ? await articlesRes.value.json() : null;

  return {
    trendingData,
    leaderboardData,
    articlesData,
    clientAppUrl: env.CLIENT_APP_URL,
    currentPath: req.path,
    is404: false,
  };
}
```

**Benefits:**

- **Parallel fetching** - All API calls happen simultaneously
- **Graceful degradation** - If one API fails, others still render
- **Type-safe** - ServerData interface ensures consistency

---

### Client-Side Data (Hydration)

**Pattern:**

```typescript
// App.tsx (client-side)
const serverData = window.__SERVER_DATA__;

// Server data is already available, no need to re-fetch
<LandingPage {...serverData} />
```

**Benefits:**

- **Zero additional requests** - Data embedded in HTML
- **Instant rendering** - No loading spinners
- **Consistent state** - Same data on server and client

---

## Components

### **LandingPage.tsx**

Main landing page component.

**Sections:**

- Hero banner with CTA
- Trending predictions preview
- Leaderboard preview (top 10)
- Recent articles
- Feature highlights
- Footer with links

**Props:**

```typescript
interface LandingPageProps {
  trendingData: PredictionView[] | null;
  leaderboardData: LeaderboardEntryView[] | null;
  articlesData: PublicArticle[] | null;
  clientAppUrl: string;
}
```

---

### **NotFound.tsx**

404 error page.

**Features:**

- Friendly error message
- Link to homepage
- Link to client app login

---

### **ThemeToggle.tsx**

Dark/light mode toggle button.

**Features:**

- Shared theme system with client app
- localStorage persistence
- No flash on page load

---

### **MaintenancePage.tsx**

Maintenance mode page.

**Usage:**

```typescript
// server.ts
if (env.MAINTENANCE_MODE === 'true') {
  return res.send(renderMaintenancePage());
}
```

---

## Theme System

### Shared Theme Variables

**Both client and public-site use the same CSS variables:**

```css
/* index.css */
:root {
  /* Surface colors */
  --color-background: #ffffff;
  --color-surface: #f8fafc;

  /* Content colors */
  --color-content: #1e293b;
  --color-content-secondary: #64748b;

  /* Interactive colors */
  --color-primary: #3b82f6;
  --color-accent: #8b5cf6;

  /* Borders */
  --color-border: #e2e8f0;
}

.dark {
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-content: #f1f5f9;
  --color-content-secondary: #cbd5e1;
  --color-primary: #60a5fa;
  --color-accent: #a78bfa;
  --color-border: #334155;
}
```

---

### Flash Prevention

**Server-side theme injection:**

```typescript
// server.ts
const html = template.replace(
  '</head>',
  `
  <script>
    // Apply theme before React hydration (prevent flash)
    (function() {
      const theme = localStorage.getItem('theme') || 'dark';
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>
  </head>
  `,
);
```

**Result:** Theme applied instantly, no white flash.

---

## SEO Optimization

### Meta Tags

**Server-side meta tag injection:**

```typescript
// server.ts
const metaTags = `
<title>ElonMuskSucks.net - Prediction Market Platform</title>
<meta name="description" content="Bet on predictions about Elon Musk, Tesla, SpaceX, and more. Real-time leaderboards, pong game, and social features." />
<meta name="keywords" content="prediction market, betting, elon musk, tesla, spacex" />

<!-- Open Graph (Facebook, LinkedIn) -->
<meta property="og:title" content="ElonMuskSucks.net" />
<meta property="og:description" content="Prediction market platform for Elon Musk-related events." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://elonmusksucks.net/" />
<meta property="og:image" content="https://elonmusksucks.net/og-image.png" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="ElonMuskSucks.net" />
<meta name="twitter:description" content="Prediction market platform." />
<meta name="twitter:image" content="https://elonmusksucks.net/og-image.png" />
`;

const html = template.replace('</head>', `${metaTags}</head>`);
```

---

### Structured Data (Schema.org)

**Add structured data for rich snippets:**

```typescript
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ElonMuskSucks.net',
  url: 'https://elonmusksucks.net/',
  description: 'Prediction market platform',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://elonmusksucks.net/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const html = template.replace(
  '</head>',
  `<script type="application/ld+json">${JSON.stringify(structuredData)}</script></head>`,
);
```

---

### Sitemap & Robots

**robots.txt:**

```
User-agent: *
Allow: /
Sitemap: https://elonmusksucks.net/sitemap.xml
```

**sitemap.xml:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://elonmusksucks.net/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

---

## Security

### Security Headers (Helmet)

**Configuration:**

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // SSR requires inline styles
        scriptSrc: ["'self'", "'unsafe-inline'"], // SSR requires inline scripts
        imgSrc: ["'self'", 'data:', 'https:'], // Allow external images
        connectSrc: ["'self'", env.API_BASE_URL],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
  }),
);
```

---

### IP Banning

**Redis-backed IP banning service:**

```typescript
// middleware/ipBanning.ts
export class IPBanningService {
  private redis: Redis;
  private whitelistedIPs: string[];

  async banIP(ip: string, reason: string, duration: number = 86400) {
    await this.redis.setex(`banned:${ip}`, duration, reason);
  }

  async isIPBanned(ip: string): Promise<boolean> {
    if (this.whitelistedIPs.includes(ip)) return false;
    return !!(await this.redis.get(`banned:${ip}`));
  }
}

// server.ts
app.use(async (req, res, next) => {
  const ip = req.ip;
  if (await ipBanService.isIPBanned(ip)) {
    return res.status(403).send('Forbidden');
  }
  next();
});
```

---

### Rate Limiting

**Express rate limiting:**

```typescript
// server.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
```

---

### HTTPS Redirect

**Production HTTPS enforcement:**

```typescript
// server.ts
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.path === '/health') return next(); // Exclude health check

    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

---

## Development

### Prerequisites

- **Node.js ≥24.0.0** (strict requirement)
- **npm 10+**
- **Server running** on port 5000 (for API proxy)

### Environment Variables

Create `.env` in repository root:

```bash
# API Server
API_BASE_URL=http://localhost:5000

# Client App URL (for redirects)
CLIENT_APP_URL=http://localhost:3000

# Redis (for IP banning)
REDIS_URL=redis://localhost:6379

# Optional
NODE_ENV=development
PORT=5173
IP_WHITELIST=127.0.0.1,::1
MAINTENANCE_MODE=false
```

### Development Commands

```bash
# Install dependencies (run from repository root)
npm install

# Start dev server (port 5173) with HMR
npm -w apps/public-site run dev

# Alternative: Vite-only dev (no SSR, faster HMR)
npm -w apps/public-site run dev:vite

# Type checking
npm -w apps/public-site run tsc -- --noEmit

# Build for production
npm -w apps/public-site run build

# Preview production build
npm -w apps/public-site run preview
```

### Development Workflow

1. **Start API server** (required for data fetching):

   ```bash
   npm -w apps/server run dev
   ```

2. **Start public-site dev server**:

   ```bash
   npm -w apps/public-site run dev
   ```

3. **Open browser:** http://localhost:5173

4. **Hot Module Replacement (HMR)** is enabled for instant feedback

---

## Build & Deployment

### Production Build

```bash
# Build SSR + client bundles
npm -w apps/public-site run build

# Output:
# - dist/server/entry-server.js (SSR bundle)
# - dist/client/index.html (HTML template)
# - dist/client/assets/*.js (client bundle)
# - dist/client/assets/*.css (styles)
```

---

### Build Configuration

**Vite config** (`vite.config.ts`):

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false, // Don't clear dist between SSR + client builds
    rollupOptions: {
      output: {
        format: 'esm', // ES modules
      },
    },
  },
  ssr: {
    noExternal: ['tailwindcss'], // Bundle TailwindCSS in SSR
  },
});
```

---

### Docker Deployment

**Multi-stage build** (`Dockerfile`):

```dockerfile
# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
EXPOSE 5173
CMD ["node", "--loader", "tsx", "server.ts"]
```

---

### Fly.io Deployment

**Configuration** (`fly.toml`):

```toml
app = "elonmusksucks-public"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "5173"
  NODE_ENV = "production"

[[services]]
  internal_port = 5173
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80
    force_https = true

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.http_checks]]
    interval = 10000
    timeout = 2000
    grace_period = "5s"
    method = "get"
    path = "/health"
```

**Deploy:**

```bash
cd apps/public-site
fly deploy
```

---

## Performance Optimizations

### 1. **SSR Caching**

**Cache rendered HTML for 60 seconds:**

```typescript
// server.ts
const renderCache = new Map<string, { html: string; timestamp: number }>();

app.get('*', async (req, res) => {
  const cacheKey = req.path;
  const cached = renderCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 60000) {
    return res.send(cached.html);
  }

  // Render and cache
  const html = await renderPage(req);
  renderCache.set(cacheKey, { html, timestamp: Date.now() });

  res.send(html);
});
```

---

### 2. **Static Asset Caching**

**Long-term caching for hashed assets:**

```typescript
// server.ts (production)
app.use(
  '/assets',
  sirv('dist/client/assets', {
    maxAge: 31536000, // 1 year
    immutable: true,
  }),
);
```

---

### 3. **Compression**

**gzip compression for responses:**

```typescript
import compression from 'compression';
app.use(compression());
```

---

### 4. **Parallel Data Fetching**

**Fetch all data simultaneously:**

```typescript
const [trending, leaderboard, articles] = await Promise.all([
  fetchTrending(),
  fetchLeaderboard(),
  fetchArticles(),
]);
```

---

## Troubleshooting

### Issue: Hydration mismatch error

**Symptoms:**

```
Warning: Text content did not match. Server: "..." Client: "..."
```

**Solution:**

1. Ensure server and client use same data (window.**SERVER_DATA**)
2. Avoid using `Date.now()` or `Math.random()` (different on server/client)
3. Check for browser-only code running on server (`typeof window !== 'undefined'`)

---

### Issue: Theme flash on page load

**Solution:**
Ensure theme script is in HTML before React hydration:

```typescript
const html = template.replace(
  '</head>',
  `
  <script>
    (function() {
      const theme = localStorage.getItem('theme') || 'dark';
      if (theme === 'dark') document.documentElement.classList.add('dark');
    })();
  </script>
  </head>
`,
);
```

---

### Issue: API data not loading

**Solution:**

1. Check API server is running on port 5000
2. Check `API_BASE_URL` environment variable
3. Check server logs for fetch errors

---

### Issue: Build fails on Vite SSR

**Solution:**

```bash
# Clear dist folder
rm -rf apps/public-site/dist

# Rebuild
npm -w apps/public-site run build
```

---

## Additional Resources

- [Vite SSR Guide](https://vitejs.dev/guide/ssr.html)
- [React SSR Documentation](https://react.dev/reference/react-dom/server)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [Main Project README](../../README.md)
- [Client App README](../client/README.md)
- [Server App README](../server/README.md)

---

## License

See [LICENSE](../../LICENSE) in repository root.
