# elonmusksucks.net 🚀

A satirical prediction market platform parodying Elon Musk's ventures with dual-application architecture. Users bet "MuskBucks" on outrageous predictions, compete on leaderboards, engage in real-time chat, and play multiplayer Pong. Features comprehensive RSS feed timeline system, achievement badges, dynamic odds calculation, and server-side rendered public site for SEO optimization.

## 🏗️ Architecture & Tech Stack

**Dual-Application Architecture:**
- **Client App** (Port 3000): Authenticated user SPA with dashboard, predictions, pong
- **Public Site** (Port 5173): Server-side rendered marketing site for SEO
- **Single API Backend**: Serves both applications with shared authentication

**Frontend:**
- **Vite 6** + **React 19** + **TypeScript 5.8** + **TailwindCSS 4**
- **Server-Side Rendering** with Vite SSR for public marketing site
- **Socket.IO Client** for real-time updates across both applications  
- **Unified Theme System** with dark/light modes and CSS variables
- **Responsive Design** with desktop/mobile dashboard variants

**Backend:**
- **Express 5** + **TypeScript** + **Prisma 6.11** ORM
- **PostgreSQL 15** with optimized indexes and materialized views
- **Redis 7** for caching, pub/sub, and session storage (IORedis client)
- **Socket.IO Server** with Redis adapter for horizontal scaling
- **BullMQ** job queue system for async processing

**Infrastructure:**
- **Real-time Updates:** Socket.IO with Redis pub/sub for cross-server broadcasting
- **Background Jobs:** BullMQ workers for payouts, leaderboards, RSS feeds, and statistics
- **File Storage:** Tigris S3-compatible object storage with image processing
- **Authentication:** JWT (access + refresh tokens) with bcrypt hashing and full page refresh
- **Email Service:** SendGrid integration for auth flows (verification, password reset)
- **Deployment:** Docker containers ready for Fly.io or similar platforms

---

## 📂 Repository Structure

```
elonmusksucks/
├── apps/
│   ├── client/          # React SPA for authenticated users (port 3000)
│   │   ├── src/
│   │   │   ├── components/  # UI components organized by feature
│   │   │   │   ├── admin/       # Admin dashboard (17+ components)
│   │   │   │   ├── dashboard/   # Main dashboard (20+ components)
│   │   │   │   ├── pong/        # Pong game components (7 components)
│   │   │   │   ├── profile/     # Profile & stats (13+ components)
│   │   │   │   ├── timeline/    # Timeline & content (5 components)
│   │   │   │   ├── theme/       # Theme system (6 components)
│   │   │   │   └── prediction/  # Prediction components
│   │   │   ├── contexts/    # React contexts (Auth, Theme, Socket, Chat, etc.)
│   │   │   ├── hooks/       # Custom hooks (activity, stats, profiles, pong)
│   │   │   ├── pages/       # Route components (Dashboard, Profile, Admin, Pong)
│   │   │   ├── theme/       # Unified theme system with CSS variables
│   │   │   └── api/         # Axios API clients with auto-refresh tokens
│   │   └── dist/            # Production build output
│   ├── public-site/     # SSR marketing site for non-authenticated users (port 5173)
│   │   ├── src/
│   │   │   ├── components/  # SSR components (13 components)
│   │   │   │   ├── LandingPage.tsx      # Homepage with stats & previews
│   │   │   │   ├── PredictionsPage.tsx  # Public predictions view
│   │   │   │   ├── LeaderboardPage.tsx  # Public leaderboard
│   │   │   │   ├── TimelinePage.tsx     # Public timeline/news
│   │   │   │   ├── Navigation.tsx       # Site nav with theme toggle
│   │   │   │   ├── ThemeToggle.tsx      # Light/dark theme switcher
│   │   │   │   └── *Preview.tsx         # Preview components for homepage
│   │   │   ├── types/       # SSR-specific TypeScript types
│   │   │   ├── entry-client.tsx   # Client hydration entry point
│   │   │   ├── entry-server.tsx   # SSR entry point
│   │   │   └── index.css          # Global styles with theme variables
│   │   ├── server.ts        # SSR server with API data fetching
│   │   └── dist/            # SSR build output
│   ├── server/          # Express backend (TypeScript, Prisma)
│   │   ├── src/
│   │   │   ├── controllers/ # REST endpoint handlers (auth, predictions, feeds)
│   │   │   ├── services/    # Business logic layer (predictions, achievements, email)
│   │   │   ├── repositories/# Data access layer (Prisma wrappers)
│   │   │   ├── handlers/    # Socket.IO event handlers (real-time updates)
│   │   │   └── workers/     # BullMQ job processors (feeds, payouts, leaderboards)
│   │   └── dist/            # Compiled JavaScript
│   └── pong-server/     # Dedicated Pong game server (Socket.IO, optimized)
│       ├── src/
│       │   ├── managers/    # Game state management (Auth, Lobby, Game, Statistics)
│       │   ├── lib/         # Core game logic (physics, AI, validation)
│       │   └── types/       # Game-specific TypeScript interfaces
│       └── dist/            # Compiled game server
├── packages/
│   └── types/           # Shared TypeScript types (auto-generated from Prisma)
├── prisma/
│   ├── schema.prisma    # Database schema definition
│   ├── migrations/      # Schema migration history
│   └── seed.ts          # Development data seeder
├── docker-compose.yml   # Local dev environment (Postgres, Redis)
├── Dockerfile.server    # Production server image
├── Dockerfile.client    # Production client image (nginx)
└── CLAUDE.md           # Comprehensive engineering guide & architecture docs
```

---

## ⚙️ Prerequisites

- **Node.js** ≥ 24.x & **npm** ≥ 8.x (for workspaces support)
- **PostgreSQL 15+** running locally with a created database
- **Redis 7+** running locally for caching, pub/sub, and job queues
- **Tigris Account** for S3-compatible file storage (profile images)
- **dotenv-cli** (`npm i -g dotenv-cli`) for environment management

**Optional but Recommended:**
- **SendGrid Account** for email services (auth flows)
- **Docker** & **Docker Compose** for containerized deployment
- **Fly.io account** or similar platform for hosting
- **Sentry Account** for error tracking in production

---

## 🔧 Quick Start

### 1. **Clone & Navigate**

```bash
git clone https://github.com/vincentDevin/elonmusksucks.git
cd elonmusksucks
```

### 2. **Environment Setup**

Copy example files and configure with your values:

```bash
cp .env.example .env
cp .env.test.example .env.test
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/elonmusksucks

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (generate secure 32+ character strings)
ACCESS_TOKEN_SECRET=your_secure_access_token_secret_here
REFRESH_TOKEN_SECRET=your_secure_refresh_token_secret_here

# Application URLs
CLIENT_APP_URL=http://localhost:3000
BASE_URL_CLIENT=http://localhost:3000
BASE_URL_SERVER=http://localhost:5000
BASE_URL_PUBLIC=http://localhost:5173
API_BASE_URL=http://localhost:5000

# Tigris S3 Storage
TIGRIS_S3_ENDPOINT=https://fly.storage.tigris.dev
TIGRIS_ACCESS_KEY_ID=tid_your_access_key
TIGRIS_SECRET_ACCESS_KEY=tsec_your_secret_key
TIGRIS_S3_BUCKET=your_bucket_name

# SendGrid Email (optional, for auth flows)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
FROM_EMAIL=noreply@elonmusksucks.net
```

### 3. **Complete Setup**

```bash
npm run setup
```

This comprehensive setup command will:
- Install dependencies across all workspaces
- Reset database and apply all Prisma migrations
- Generate Prisma client and shared TypeScript types
- Build the type packages
- Seed development data (predictions, users, bets)
- Seed achievement catalog (77 achievements across 8 categories)

### 4. **Start Development Environment**

```bash
npm run dev
```

**Access Points:**
- **🎯 Client App (Authenticated):** [http://localhost:3000](http://localhost:3000)
- **🌐 Public Site (Marketing):** [http://localhost:5173](http://localhost:5173)
- **🔌 Backend API:** [http://localhost:5000](http://localhost:5000)
- **🏓 Pong Game Server:** [http://localhost:5001](http://localhost:5001)
- **👑 Admin Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin)

**Development Features:**
- 🔄 Hot reload on all applications (client, public-site, server)
- 🔌 Real-time WebSocket connections across both frontend apps
- 📊 Live prediction markets with dynamic odds calculation
- 💬 Real-time chat functionality (desktop only currently)
- 🏓 **Real-time multiplayer Pong game** with MuskBucks wagering
- 🎨 **Unified theme system** with dark/light modes across both apps
- 📰 RSS feed timeline with admin moderation
- 🏆 Achievement system with 77 unlockable badges
- 🎯 Parlay betting system with multipliers
- 🌍 **SEO-optimized public site** with server-side rendering

---

## 🧪 Testing & Quality Assurance

### **Test Suite**
```bash
# Run all tests across the monorepo
npm test

# Backend-specific tests
npm run test:server

# Linting & formatting
npm run lint
npm run format
```

### **Test Coverage**
- **Unit Tests:** Service layer, utilities, and business logic
- **Integration Tests:** API endpoints and database operations  
- **Component Tests:** React components and hooks (limited coverage)

**Test Structure:**
- `apps/server/tests/unit/` - Service and utility tests
- `apps/server/tests/integration/` - API endpoint tests
- Uses separate `.env.test` environment for isolated testing

### **Code Quality**
- **ESLint:** Zero-warning policy enforced across all applications
- **Prettier:** Consistent code formatting
- **TypeScript:** Strict type checking across all packages (client, public-site, server)
- **Pre-commit Hooks:** Automated linting and formatting

---

## ⚡ Core Features & Architecture

### **🌐 Dual-Application Architecture**
- **Public Site (SSR):** Marketing-focused content for non-authenticated users with SEO optimization
- **Client App (SPA):** Full-featured application for authenticated users with real-time updates
- **Unified Authentication:** Seamless flow between public marketing and private application
- **Shared Theme System:** Consistent dark/light theming across both applications
- **Performance Optimized:** SSR for fast initial loads, SPA for rich interactions

### **🔐 Enhanced Authentication System**
- **Multi-step Registration:** Email verification with enhanced verification screen
- **Secure Login Flow:** JWT tokens with full page refresh for proper state initialization
- **Profile Setup:** Mandatory completion flow with image upload and form validation
- **Token Management:** Automatic refresh with axios interceptors and failure handling
- **Dual-Application Security:** Public routes open, private routes protected with guards

### **🎨 Unified Theme System**
- **CSS Variables:** Semantic color tokens shared across applications
- **Dark Mode Default:** Both apps default to dark theme with toggle options
- **Flash Prevention:** Theme applied before hydration to prevent visual flash
- **Consistent Styling:** Identical color schemes and component patterns
- **Theme Persistence:** localStorage saves user preferences across sessions

### **Prediction Market Engine**
- **Multi-option Predictions:** Users create and bet on complex prediction markets
- **6-Factor Dynamic Odds Engine:** Real-time odds calculation with market heat indicators  
- **Advanced Parlay System:** Combine multiple predictions with bonus multipliers
- **Automated Payouts:** BullMQ workers process results and distribute winnings
- **Prediction Source Links:** Link articles/tweets as evidence for predictions

### **Real-time Systems**
- **Socket.IO Integration:** Live updates for bets, predictions, chat, timeline, leaderboards, and pong games
- **Unified Activity Feed:** Real-time global activity ticker with Redis pub/sub
- **Live Statistics:** User stats, rankings, and achievements update instantly
- **Cross-server Broadcasting:** Redis adapter enables horizontal scaling
- **21+ Socket Event Types:** Comprehensive real-time coverage across all features
- **Dedicated Pong Server:** Optimized game server with 60fps physics and minimal latency

### **Content & Timeline**
- **RSS Feed Ingestion:** BullMQ workers fetch and process feeds with deduplication
- **Admin Moderation Queue:** Bulk approve/reject articles with keyboard shortcuts
- **Public Timeline:** Server-side rendered timeline for SEO with infinite-scroll
- **Auto-tagging System:** Rule-based categorization (Tesla, SpaceX, Legal, Markets, AI)
- **OPML Import/Export:** Manage feed subscriptions efficiently

### **User Experience**
- **Responsive Dashboard:** Desktop and mobile-optimized layouts (chat desktop-only)
- **Profile System:** Avatar uploads with automatic image processing via Tigris S3
- **Achievement System:** 77 achievements across 8 categories with real-time unlocking
- **RuneScape-Style Currency:** Formatted as 1.2k, 1.5M with wealth-based colors
- **Real-time Pong Arena:** Multiplayer Pong with MuskBucks wagering, AI opponents, and spectating

### **🏓 Real-time Pong Game System**
- **Multiplayer Gaming:** Real-time PVP and AI opponents with adjustable difficulty
- **MuskBucks Wagering:** Secure upfront wager deduction with automatic payouts
- **Advanced Physics:** 128fps game loop with client-authoritative paddle movement
- **Spectator System:** Watch live games with dedicated socket connections
- **Performance Optimized:** ~1KB per game, 3 database queries per match
- **Mobile Support:** Touch controls with responsive canvas rendering
- **Free Play Mode:** 0 MuskBucks wager for testing and practice
- **Production Scaling:** Fly.io auto-scaling architecture for 10,000+ concurrent players

### **Admin & Moderation**
- **Admin Dashboard:** Prediction management, user moderation, feed management
- **Real-time Metrics:** Live performance monitoring with Socket.IO broadcasts
- **Shame Wall System:** Public display of banned users with reason tracking
- **Feed Health Monitoring:** Track success rates, failures, and approval metrics
- **Bulk Operations:** Mass moderation actions with transaction safety

---

## 📦 Available Scripts

### **Root Level Commands**

| Command | Description |
|---------|-------------|
| `npm run setup` | Complete initial setup: install deps, migrate DB, seed data, build types |
| `npm run dev` | Start all services: client (3000), public-site (5173), server (5000), pong (5001) |
| `npm run build` | Production build: generate types → build client → build public-site → build server |
| `npm run lint` | ESLint check with zero-warning policy across all apps |
| `npm run format` | Prettier formatting across all code |
| `npm test` | Run Jest test suite (limited coverage currently) |
| `npm run test:server` | Server-only Jest tests |

### **Database & Development**

| Command | Description |
|---------|-------------|
| `npm run prisma:generate` | Regenerate Prisma client after schema changes |
| `npm run prisma:migrate:dev` | Reset DB and apply all migrations |
| `npm run seed:dev` | Populate DB with test data |
| `npm run seed:achievements` | Seed achievement catalog (77 achievements) |
| `npm run worker` | Start payout + leaderboard + feed workers manually |
| `npm run dev:pong` | Start pong game server only (port 5001) |
| `npm run dev:public` | Start public-site SSR server only (port 5173) |

### **Workspace-Specific Commands**

**Client (`apps/client/`):**
- `npm run dev` - Vite development server (authenticated users)
- `npm run build` - Production build  
- `npm run preview` - Preview production build

**Public Site (`apps/public-site/`):**
- `npm run dev` - Vite SSR development server (marketing site)
- `npm run build` - SSR production build
- `npm run preview` - Preview SSR build

**Server (`apps/server/`):**
- `npm run dev` - Express server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run worker` - Start background job workers

**Pong Server (`apps/pong-server/`):**
- `npm run dev` - Pong game server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production pong server

---

## 🐞 Troubleshooting

### **Common Issues**

**Environment Variables Not Loading**
- Ensure `.env` and `.env.test` are in the repository root
- Check that all required variables are set (see environment setup)
- Verify no syntax errors in env files (no spaces around `=`)

**Database Connection Issues**
- Confirm PostgreSQL 15+ is running locally
- Verify database exists: `createdb elonmusksucks`
- Check DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
- Run `npm run prisma:migrate:dev` to reset and apply all migrations

**Redis Connection Failures**
- Start Redis server: `redis-server` or via Docker
- Verify Redis is accessible: `redis-cli ping` should return `PONG`
- Check REDIS_URL format: `redis://localhost:6379`

**SSR/Public Site Issues**
- Ensure public-site server is running on port 5173: `npm run dev:public`
- Check that API server is accessible from SSR server
- Verify theme hydration is working (no flash on page load)
- **Fixed Issue:** All hardcoded colors replaced with theme variables

**Authentication Flow Issues**
- **Fixed Issue:** Login/register/profile-setup now use full page refresh for proper state initialization
- **Fixed Issue:** Enhanced verification screen with prominent login button
- **Fixed Issue:** Profile setup redirects properly after completion

**Socket.IO/WebSocket Issues**
- Check that both client and server are running
- Verify ports 3000 (client), 5173 (public-site), 5000 (server), and 5001 (pong server) are not blocked
- Monitor browser console and server logs for connection errors
- **Fixed Issue:** All Socket.IO memory leaks and event handling resolved

**Theme System Issues**
- **Fixed Issue:** Consistent theming across client app and public site
- **Fixed Issue:** Theme toggle works properly with persistence
- **Fixed Issue:** No theme flash during SSR hydration or SPA navigation

**Node.js Version Issues**
- Use Node.js ≥24.x: `node --version`
- Use npm ≥8.x: `npm --version`  
- Consider using `.nvmrc` for version consistency

### **Performance Issues**
- **Large Bundle Size:** Code splitting is implemented for admin dashboard
- **Database Queries:** Optimized with proper indexes and includes
- **Memory Usage:** Socket.IO cleanup and Redis connection pooling implemented
- **SSR Performance:** Server-side rendering optimized for fast initial loads

### **Getting Help**
- Check `CLAUDE.md` for comprehensive architecture documentation
- Review recent commit messages for context on fixes
- Open an issue on GitHub with error logs and environment details

---

## 🚀 Production Status & Roadmap

### **✅ Production Ready Features**
- **Dual-Application Architecture:** Complete SSR public site + authenticated client app
- **Enhanced Authentication System:** Secure login/register/profile flows with full page refresh
- **Unified Theme System:** Dark/light themes with CSS variables across both applications
- **Dynamic Betting System:** 6-factor odds engine with real-time updates
- **Real-time Pong Arena:** Complete multiplayer game system with secure wagering
- **Achievement System:** 77 achievements across 8 categories fully operational
- **SSR Public Timeline:** Server-side rendered news feed with admin moderation
- **Prediction Source Links:** Articles/tweets linked to predictions
- **Unified Activity System:** Real-time global activity feed
- **Socket.IO Infrastructure:** 21+ event types with Redis adapter
- **Transaction Atomicity:** All money operations wrapped in Prisma transactions
- **BigInt Migration:** Unlimited monetary precision for all financial values
- **Email Service:** SendGrid integration for auth flows
- **Database Performance:** 44 production indexes covering all query patterns
- **Theme Compatibility:** All components support light/dark theme switching

### **🚧 Current Priority Tasks**
- **Mobile Chat Integration:** Add chat panel to mobile dashboard (currently desktop-only)
- **Logging Infrastructure:** Replace console.logs with structured logging
- **Performance Monitoring:** Load testing for both SSR and SPA applications
- **SEO Optimization:** Enhanced meta tags and structured data for public site

### **📋 Known Issues & Technical Debt**
- **Mobile Chat Missing:** Chat component not included in mobile dashboard
- **Console.log Statements:** Development logs in production code (50+ files)
- **Limited Test Coverage:** Currently ~5% coverage, needs expansion for SSR components
- **No API Versioning:** API endpoints not versioned for backwards compatibility

### **🎯 Upcoming Features**
1. **Enhanced SEO:** Rich snippets, social media cards, and structured data for public site
2. **3D Pong Upgrade:** Three.js 3D rendering with dynamic camera angles and particle effects
3. **Enhanced Analytics:** User behavior tracking and prediction performance metrics
4. **Advanced Parlay Builder:** Visual interface for complex multi-leg bets
5. **Social Features:** User follows, prediction sharing, comment threads
6. **Pong Tournament System:** Brackets, leaderboards, and championship events
7. **Market Insights:** AI-powered prediction analysis and trends

### **🤝 Contributing**

We welcome contributions! Please see our [contribution guidelines](./CONTRIBUTING.md) and check the [project board](https://github.com/vincentDevin/elonmusksucks/projects/1) for current issues.

**Development Workflow:**
```bash
git checkout -b feat/your-feature-name
# Make changes following the patterns in CLAUDE.md
npm run lint  # Ensure zero warnings across all apps
npm test      # Run tests
git commit -m "feat: add your feature description"
```

**Commit Style:** `type(scope): message`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Scopes: `client`, `public-site`, `server`, `pong`, `theme`, `auth`
- Example: `feat(public-site): add dark mode theme toggle`

---

## 📜 License & Legal

**MIT License** — see [LICENSE](./LICENSE) for full details.

**Disclaimer:** This is a satirical project for educational and entertainment purposes. No real money is involved. No liability if Elon Musk attempts to acquire, manipulate, or otherwise interfere with this platform.

**Privacy & Security:**
- JWT-based authentication with secure token refresh and full page refresh
- Password hashing via bcrypt with configurable rounds
- CORS configured for known origins only
- Input validation on all API endpoints
- SQL injection protection via Prisma parameterized queries
- SSR security with proper sanitization and CSP headers

---

## 📚 Documentation & Resources

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive engineering guide and architecture documentation
- **[Database Schema](./prisma/schema.prisma)** - Complete data model definitions with 44 indexes
- **[Theme System Guide](./CLAUDE.md#unified-theme-system)** - Component development with dual-app theming
- **[SSR Architecture](./CLAUDE.md#dual-application-architecture)** - Server-side rendering implementation
- **[Authentication Flow](./CLAUDE.md#authentication-architecture)** - Security and auth documentation

**External Dependencies:**
- **[Vite](https://vitejs.dev)** - Frontend build tool and dev server (+ SSR support)
- **[React](https://react.dev)** - UI library with hooks and context
- **[Prisma](https://www.prisma.io/docs)** - Database ORM and migrations  
- **[Socket.IO](https://socket.io/docs/v4)** - Real-time WebSocket communication
- **[BullMQ](https://docs.bullmq.io)** - Redis-based job queue system
- **[TailwindCSS](https://tailwindcss.com/docs)** - Utility-first CSS framework
- **[Tigris](https://docs.tigris.dev)** - S3-compatible object storage

---

**Built with ❤️ and questionable life choices by the development team.**  
*Now with 100% more TypeScript, server-side rendering, and 0% more Elon approval.*