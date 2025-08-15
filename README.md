# elonmusksucks.net 🚀

A satirical prediction market platform parodying Elon Musk's ventures. Users bet "MuskBucks" on outrageous predictions, compete on leaderboards, and engage in real-time chat. Features a comprehensive RSS feed timeline system, achievement badges, and dynamic odds calculation. Production-ready TypeScript monorepo with real-time Socket.IO updates.

## 🏗️ Architecture & Tech Stack

**Frontend:**
- **Vite 6** + **React 19** + **TypeScript 5.8** + **TailwindCSS 4**
- **Socket.IO Client** for real-time updates
- **Unified Theme System** with 10 themes across light/dark/high-contrast categories
- **Responsive Design** with separate desktop/mobile dashboard variants

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
- **Authentication:** JWT (access + refresh tokens) with bcrypt hashing
- **Email Service:** SendGrid integration for auth flows (verification, password reset)
- **Deployment:** Docker containers ready for Fly.io or similar platforms

---

## 📂 Repository Structure

```
elonmusksucks/
├── apps/
│   ├── client/          # Vite + React frontend (TypeScript, TailwindCSS)
│   │   ├── src/
│   │   │   ├── components/  # UI components (unified cards, timeline, admin panels)
│   │   │   ├── contexts/    # React contexts (Auth, Parlay, Chat, Socket, Timeline)
│   │   │   ├── hooks/       # Custom hooks (activity streams, stats, profiles)
│   │   │   ├── pages/       # Route components (Dashboard, Profile, Admin, Timeline)
│   │   │   ├── theme/       # Unified theme system (10 themes, semantic colors)
│   │   │   └── api/         # Axios API clients with auto-refresh tokens
│   │   └── dist/            # Production build output
│   └── server/          # Express backend (TypeScript, Prisma)
│       ├── src/
│       │   ├── controllers/ # REST endpoint handlers (auth, predictions, feeds)
│       │   ├── services/    # Business logic layer (predictions, achievements, email)
│       │   ├── repositories/# Data access layer (Prisma wrappers)
│       │   ├── handlers/    # Socket.IO event handlers (real-time updates)
│       │   └── workers/     # BullMQ job processors (feeds, payouts, leaderboards)
│       └── dist/            # Compiled JavaScript
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
- **Frontend (Client):** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Admin Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin)

**Development Features:**
- 🔄 Hot reload on both client and server
- 🔌 Real-time WebSocket connections
- 📊 Live prediction markets with dynamic odds calculation
- 💬 Real-time chat functionality (desktop only currently)
- 🎨 Theme system with 10 themes across light/dark/high-contrast
- 📰 RSS feed timeline with admin moderation
- 🏆 Achievement system with 77 unlockable badges
- 🎯 Parlay betting system with multipliers

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
- **ESLint:** Zero-warning policy enforced
- **Prettier:** Consistent code formatting
- **TypeScript:** Strict type checking across all packages
- **Pre-commit Hooks:** Automated linting and formatting

---

## ⚡ Core Features & Architecture

### **Prediction Market Engine**
- **Multi-option Predictions:** Users create and bet on complex prediction markets
- **6-Factor Dynamic Odds Engine:** Real-time odds calculation with market heat indicators  
- **Advanced Parlay System:** Combine multiple predictions with bonus multipliers
- **Automated Payouts:** BullMQ workers process results and distribute winnings
- **Prediction Source Links:** Link articles/tweets as evidence for predictions

### **Real-time Systems**
- **Socket.IO Integration:** Live updates for bets, predictions, chat, timeline, and leaderboards
- **Unified Activity Feed:** Real-time global activity ticker with Redis pub/sub
- **Live Statistics:** User stats, rankings, and achievements update instantly
- **Cross-server Broadcasting:** Redis adapter enables horizontal scaling
- **21 Socket Event Types:** Comprehensive real-time coverage across all features

### **Content & Timeline**
- **RSS Feed Ingestion:** BullMQ workers fetch and process feeds with deduplication
- **Admin Moderation Queue:** Bulk approve/reject articles with keyboard shortcuts
- **Homepage Timeline:** Infinite-scroll articles with "Use as prediction source"
- **Auto-tagging System:** Rule-based categorization (Tesla, SpaceX, Legal, Markets, AI)
- **OPML Import/Export:** Manage feed subscriptions efficiently

### **User Experience**
- **Unified Theme System:** 10 themes across light/dark/high-contrast categories
- **Responsive Dashboard:** Desktop and mobile-optimized layouts (chat desktop-only)
- **Profile System:** Avatar uploads with automatic image processing via Tigris S3
- **Achievement System:** 77 achievements across 8 categories with real-time unlocking
- **RuneScape-Style Currency:** Formatted as 1.2k, 1.5M with wealth-based colors

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
| `npm run dev` | Start all services concurrently (client:3000, server:5000, workers) |
| `npm run build` | Production build: generate types → build client → build server |
| `npm run lint` | ESLint check with zero-warning policy |
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

### **Workspace-Specific Commands**

**Client (`apps/client/`):**
- `npm run dev` - Vite development server
- `npm run build` - Production build  
- `npm run preview` - Preview production build

**Server (`apps/server/`):**
- `npm run dev` - Express server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run worker` - Start background job workers

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

**Tigris/S3 Upload Errors**
- Verify Tigris credentials are correct in `.env`
- Ensure bucket exists and is accessible
- Check network connectivity to Tigris endpoint
- **Fixed Issue:** Profile image uploads now properly handle authentication tokens

**Socket.IO/WebSocket Issues**
- Check that both client and server are running
- Verify ports 3000 (client) and 5000 (server) are not blocked
- Monitor browser console and server logs for connection errors
- **Fixed Issue:** All Socket.IO memory leaks and event handling resolved

**Node.js Version Issues**
- Use Node.js ≥24.x: `node --version`
- Use npm ≥8.x: `npm --version`  
- Consider using `.nvmrc` for version consistency

### **Performance Issues**
- **Large Bundle Size:** Code splitting is implemented for admin dashboard
- **Database Queries:** Optimized with proper indexes and includes
- **Memory Usage:** Socket.IO cleanup and Redis connection pooling implemented

### **Getting Help**
- Check `CLAUDE.md` for comprehensive architecture documentation
- Review recent commit messages for context on fixes
- Open an issue on GitHub with error logs and environment details

---

## 🚀 Production Status & Roadmap

### **✅ Production Ready Features**
- **Dynamic Betting System:** 6-factor odds engine with real-time updates
- **Achievement System:** 77 achievements across 8 categories fully operational
- **Homepage Timeline:** RSS feed ingestion with admin moderation
- **Prediction Source Links:** Articles/tweets linked to predictions
- **Unified Theme System:** 10 themes with semantic color classes
- **Unified Activity System:** Real-time global activity feed
- **Socket.IO Infrastructure:** 21 event types with Redis adapter
- **Transaction Atomicity:** All money operations wrapped in Prisma transactions
- **BigInt Migration:** Unlimited monetary precision for all financial values
- **Email Service:** SendGrid integration for auth flows
- **Database Performance:** 44 production indexes covering all query patterns

### **🚧 Current Priority Tasks**
- **Mobile Chat Integration:** Add chat panel to mobile dashboard (currently desktop-only)
- **Logging Infrastructure:** Replace 50+ console.logs with structured logging
- **Performance Monitoring:** Load testing for timeline and betting systems
- **SSR Implementation:** Server-side rendering for SEO optimization

### **📋 Known Issues & Technical Debt**
- **Mobile Chat Missing:** Chat component not included in mobile dashboard
- **Console.log Statements:** Development logs in production code (50+ files)
- **Limited Test Coverage:** Currently ~5% coverage, needs expansion
- **No API Versioning:** API endpoints not versioned for backwards compatibility

### **🎯 Upcoming Features**
1. **Enhanced Analytics:** User behavior tracking and prediction performance metrics
2. **Advanced Parlay Builder:** Visual interface for complex multi-leg bets
3. **Social Features:** User follows, prediction sharing, comment threads
4. **Market Insights:** AI-powered prediction analysis and trends

### **🤝 Contributing**

We welcome contributions! Please see our [contribution guidelines](./CONTRIBUTING.md) and check the [project board](https://github.com/vincentDevin/elonmusksucks/projects/1) for current issues.

**Development Workflow:**
```bash
git checkout -b feat/your-feature-name
# Make changes following the patterns in CLAUDE.md
npm run lint  # Ensure zero warnings
npm test      # Run tests
git commit -m "feat: add your feature description"
```

**Commit Style:** `type(scope): message`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Example: `feat(predictions): add multi-option support`

---

## 📜 License & Legal

**MIT License** — see [LICENSE](./LICENSE) for full details.

**Disclaimer:** This is a satirical project for educational and entertainment purposes. No real money is involved. No liability if Elon Musk attempts to acquire, manipulate, or otherwise interfere with this platform.

**Privacy & Security:**
- JWT-based authentication with secure token refresh
- Password hashing via bcrypt with configurable rounds
- CORS configured for known origins only
- Input validation on all API endpoints
- SQL injection protection via Prisma parameterized queries

---

## 📚 Documentation & Resources

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive engineering guide and architecture documentation
- **[Database Schema](./prisma/schema.prisma)** - Complete data model definitions with 44 indexes
- **[Theme System Guide](./CLAUDE.md#unified-theme-system)** - Component development with 10 themes
- **[Socket Events Reference](./CLAUDE.md#socket-events)** - Real-time event documentation

**External Dependencies:**
- **[Vite](https://vitejs.dev)** - Frontend build tool and dev server
- **[React](https://react.dev)** - UI library with hooks and context
- **[Prisma](https://www.prisma.io/docs)** - Database ORM and migrations  
- **[Socket.IO](https://socket.io/docs/v4)** - Real-time WebSocket communication
- **[BullMQ](https://docs.bullmq.io)** - Redis-based job queue system
- **[TailwindCSS](https://tailwindcss.com/docs)** - Utility-first CSS framework
- **[Tigris](https://docs.tigris.dev)** - S3-compatible object storage

---

**Built with ❤️ and questionable life choices by the development team.**  
*Now with 100% more TypeScript and 0% more Elon approval.*
