# Client App - React 19 SPA

**Enterprise-grade React 19 single-page application** with advanced real-time features, optimistic UI updates, and sophisticated state management for authenticated users of the elonmusksucks.net prediction market platform.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Directory Structure](#directory-structure)
- [Context Providers](#context-providers)
- [Custom Hooks](#custom-hooks)
- [Component Organization](#component-organization)
- [Real-time Event System](#real-time-event-system)
- [Routing & Navigation](#routing--navigation)
- [Theme System](#theme-system)
- [State Management Patterns](#state-management-patterns)
- [Development](#development)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)
- [Performance Optimizations](#performance-optimizations)
- [Key Patterns & Best Practices](#key-patterns--best-practices)

---

## Overview

The **client app** is the primary user-facing application for authenticated users. It provides a rich, interactive experience with:

- **Real-time prediction markets** with live updates
- **Multiplayer Pong game** with MuskBucks wagering
- **Social features** (posts, reactions, follows, chat)
- **Timeline & content discovery** (articles, trending predictions)
- **User profiles & achievements** (77 achievements across 8 categories)
- **Admin dashboard** (user management, content moderation, analytics)
- **Live leaderboards** with daily/weekly/all-time rankings

**Key Differentiators:**
- React 19 features (`useOptimistic`, `startTransition`, `use()`)
- EventBusCore architecture for zero-overhead event handling
- Hydration watermark pattern to prevent race conditions
- Room lifecycle management for automatic Socket.IO join/leave
- Advanced chunk splitting for optimal caching

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Port 3000)                     │
├─────────────────────────────────────────────────────────────┤
│  React 19 SPA                                                │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────┐│
│  │  REST API      │  │  Socket.IO       │  │  Theme       ││
│  │  (axios)       │  │  (real-time)     │  │  System      ││
│  └────────┬───────┘  └────────┬─────────┘  └──────────────┘│
│           │                   │                              │
│           ├───────────────────┴──────────────────────┐      │
│           │              EventBusCore                 │      │
│           │         (Central Event Bus)               │      │
│           └───────────────────┬──────────────────────┘      │
│                               │                              │
│  ┌────────────────────────────┴─────────────────────────┐  │
│  │          Context Providers (16 contexts)              │  │
│  │  Auth • Socket • EventBus • Prediction • Timeline     │  │
│  │  Chat • Activity • Achievement • Parlay • UserData    │  │
│  │  Theme • Admin • Reaction • Bookmark • Cache • Flags  │  │
│  └────────────────────────────┬─────────────────────────┘  │
│                               │                              │
│  ┌────────────────────────────┴─────────────────────────┐  │
│  │             Pages & Components (75+)                  │  │
│  │  Timeline • Predictions • Pong • Profile • Admin      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           │                          │
           ├──── HTTP ────────────────┤
           │                          │
      ┌────▼────┐              ┌─────▼──────┐
      │  Server │◄──Redis──────►Pong Server │
      │ (5000)  │   Pub/Sub    │   (5001)   │
      └─────────┘              └────────────┘
```

### Context Hierarchy

The app uses a **strict provider hierarchy** to manage dependencies and re-render boundaries:

```tsx
<BrowserRouter>
  <SocketProvider>                    {/* 1. Socket connection */}
    <EventBusCoreProvider>            {/* 2. Central event bus */}
      <AuthProvider>                  {/* 3. Authentication */}
        <EventBusMetricsProvider>     {/* 4. Metrics (isolated) */}
          <UnifiedThemeProvider>      {/* 5. Theme management */}
            <ActivityProvider>        {/* 6. Activity stream */}
              <AchievementProvider>   {/* 7. Achievements */}
                <ReactionProvider>    {/* 8. Post reactions */}
                  <BookmarkProvider>  {/* 9. Bookmarks */}
                    <PredictionProvider>     {/* 10. Predictions */}
                      <ParlayProvider>       {/* 11. Parlays */}
                        <ChatProvider>       {/* 12. Chat */}
                          <NotificationProvider>  {/* 13. Notifications */}
                            <HydrationMarker />   {/* Event queue release */}
                            <EventHandlers />     {/* Global event routing */}
                            <AppRoutes />         {/* React Router */}
                            <NotificationContainer />
                          </NotificationProvider>
                        </ChatProvider>
                      </ParlayProvider>
                    </PredictionProvider>
                  </BookmarkProvider>
                </ReactionProvider>
              </AchievementProvider>
            </ActivityProvider>
          </UnifiedThemeProvider>
        </EventBusMetricsProvider>
      </AuthProvider>
    </EventBusCoreProvider>
  </SocketProvider>
</BrowserRouter>
```

**Why this order?**
1. **Socket** must exist before EventBus (EventBus subscribes to socket events)
2. **EventBusCore** must exist before Auth (Auth emits events)
3. **Auth** must exist before domain contexts (they depend on user state)
4. **EventBusMetrics** is isolated to prevent re-render cascades
5. **Domain contexts** are ordered by dependency (Activity → Achievement → Reaction → etc.)

---

## Technology Stack

### Core Framework
- **React 19.1.0** - Latest React with concurrent features
- **React Router 7.6.2** - Client-side routing with lazy loading
- **TypeScript 5.8.3** - Strict type safety

### UI & Styling
- **TailwindCSS 4.1.8** - Utility-first CSS with custom theme system
- **@tailwindcss/vite 4.1.8** - Vite integration
- **React Icons 5.5.0** - Icon library (Heroicons, FontAwesome, etc.)
- **@heroicons/react 2.2.0** - Official Heroicons for React

### Real-time & Networking
- **Socket.IO Client 4.8.1** - WebSocket communication with fallback
- **Axios 1.9.0** - HTTP client with interceptors for auth
- **IORedis** (server-side) - Redis pub/sub for multi-instance sync

### State Management
- **React Context API** - 16 context providers for domain state
- **EventBusCore** - Custom event bus with React 19 optimizations
- **React 19 Features**:
  - `useOptimistic` - Optimistic UI updates for betting
  - `startTransition` - Non-blocking state updates
  - `use()` - Async resource loading

### UI Components & Interactions
- **react-hot-toast 2.6.0** - Notification system
- **react-image-crop 11.0.10** - Avatar cropping
- **react-window 1.8.11** - Virtualized lists for performance

### Build Tools
- **Vite 7.1.9** - Lightning-fast dev server and bundler
- **@vitejs/plugin-react 5.0.4** - React Fast Refresh
- **Terser 5.44.0** - Production minification

### Testing
- **Vitest 3.2.4** - Vite-native test runner
- **@testing-library/react 16.1.0** - React testing utilities
- **@testing-library/user-event 14.5.2** - User interaction simulation
- **jsdom 24.1.1** - DOM implementation for Node.js

### Code Quality
- **ESLint 9.25.0** - Linting with React hooks plugin
- **TypeScript ESLint 8.30.1** - TypeScript-specific rules
- **Prettier** (inherited from root) - Code formatting

---

## Directory Structure

```
apps/client/
├── src/
│   ├── api/                      # API client modules
│   │   ├── axios.ts              # Axios instance with interceptors
│   │   └── endpoints.ts          # API endpoint definitions
│   │
│   ├── assets/                   # Static assets (images, fonts)
│   │
│   ├── components/               # Reusable UI components
│   │   ├── achievements/         # Achievement cards, celebrations
│   │   ├── admin/                # Admin dashboard components (30+)
│   │   │   ├── achievements/     # Achievement management UI
│   │   │   ├── content-management/ # Feed & article moderation
│   │   │   ├── financial/        # Transaction monitoring
│   │   │   ├── predictions/      # Prediction management
│   │   │   ├── system/           # Database & system monitoring
│   │   │   └── users/            # User management & moderation
│   │   ├── auth/                 # Auth forms (login, register)
│   │   ├── leaderboard/          # Leaderboard entries & rankings
│   │   ├── notifications/        # Toast notifications
│   │   ├── pong/                 # Pong game UI components
│   │   ├── posts/                # Social posts (cards, creation, reactions)
│   │   ├── prediction/           # Prediction cards, betting UI
│   │   ├── profile/              # Profile header, stats, graphs
│   │   └── timeline/             # Timeline articles, widgets
│   │
│   ├── config/                   # Configuration files
│   │   ├── env.ts                # Environment variable validation
│   │   └── socket.ts             # Socket.IO client config
│   │
│   ├── contexts/                 # React Context providers (16)
│   │   ├── AuthContext.tsx       # Authentication state & JWT management
│   │   ├── SocketContext.tsx     # Socket.IO singleton provider
│   │   ├── EventBusCoreContext.tsx    # Central event bus (stable)
│   │   ├── EventBusMetricsContext.tsx # Metrics tracking (isolated)
│   │   ├── PredictionContext.tsx      # Prediction market state
│   │   ├── ParlayContext.tsx          # Parlay betting state
│   │   ├── ChatContext.tsx            # Global chat state
│   │   ├── TimelineContext.tsx        # Articles & feeds
│   │   ├── ActivityContext.tsx        # Activity stream
│   │   ├── AchievementContext.tsx     # Achievement unlocks
│   │   ├── UserDataContext.tsx        # User profile & stats
│   │   ├── ReactionContext.tsx        # Post reactions
│   │   ├── BookmarkContext.tsx        # Bookmarked content
│   │   ├── ThemeContext.tsx           # Theme toggling
│   │   ├── AdminContext.tsx           # Admin-specific state
│   │   ├── FlagsContext.tsx           # Feature flags
│   │   └── CacheContext.tsx           # Client-side cache
│   │
│   ├── hooks/                    # Custom React hooks (30+)
│   │   ├── useApi.ts             # API request wrapper
│   │   ├── useBettingEvents.ts   # Betting event subscriptions
│   │   ├── useFinancialEvents.ts # Balance & transaction events
│   │   ├── useLeaderboardEvents.ts # Leaderboard updates
│   │   ├── usePongEvents.ts      # Pong game events
│   │   ├── useTimelineEvents.ts  # Timeline & article events
│   │   ├── useSocialEvents.ts    # Social feature events
│   │   ├── useOptimisticBetting.ts # Optimistic UI for bets
│   │   ├── useOptimisticUpdate.ts  # Generic optimistic updates
│   │   ├── useRoomLifecycle.ts   # Auto socket room join/leave
│   │   ├── useEventSystemMetrics.ts # Event system monitoring
│   │   ├── usePredictionDiscovery.ts # Prediction exploration
│   │   ├── usePongSocket.ts      # Pong server connection
│   │   ├── usePongInput.ts       # Keyboard/touch controls
│   │   ├── useInfiniteScroll.ts  # Infinite scroll pagination
│   │   ├── useDebounce.ts        # Debounced values
│   │   ├── useTheme.ts           # Theme management
│   │   └── ...                   # More specialized hooks
│   │
│   ├── lib/                      # Utility libraries
│   │   ├── hydrationWatermark.ts # Hydration guard for events
│   │   └── utils.ts              # General utilities
│   │
│   ├── pages/                    # Page components (top-level routes)
│   │   ├── Timeline.tsx          # Main timeline/dashboard
│   │   ├── Predictions.tsx       # Prediction market browser
│   │   ├── Leaderboard.tsx       # User rankings
│   │   ├── Profile.tsx           # User profile pages
│   │   ├── Pong.tsx              # Pong game lobby & play
│   │   ├── AdminDashboard.tsx    # Admin control panel
│   │   ├── Login.tsx             # Login form
│   │   ├── Register.tsx          # Registration form
│   │   ├── ForgotPassword.tsx    # Password reset request
│   │   ├── ResetPassword.tsx     # Password reset form
│   │   └── ProfileSetup.tsx      # First-time profile completion
│   │
│   ├── routes/                   # Routing configuration
│   │   └── AppRoutes.tsx         # Main route definitions
│   │
│   ├── theme/                    # Theme system
│   │   ├── components/           # Theme-aware components
│   │   ├── hooks/                # Theme hooks
│   │   ├── themes/               # Theme definitions
│   │   └── utils/                # Theme utilities
│   │
│   ├── types/                    # Client-specific types
│   │   └── *.ts                  # Local type definitions
│   │
│   ├── utils/                    # Utility functions
│   │   └── *.ts                  # Helper functions
│   │
│   ├── App.tsx                   # Root component with providers
│   ├── main.tsx                  # Entry point with theme flash prevention
│   ├── index.css                 # Global styles & Tailwind imports
│   └── vite-env.d.ts             # Vite type definitions
│
├── public/                       # Static public assets
│   └── *.svg                     # Logos, icons
│
├── dist/                         # Production build output (gitignored)
│
├── index.html                    # HTML entry point
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # TailwindCSS configuration
├── tsconfig.json                 # TypeScript base config
├── tsconfig.app.json             # App-specific TS config
├── tsconfig.node.json            # Node-specific TS config
├── vitest.config.ts              # Vitest test configuration
├── eslint.config.js              # ESLint configuration
├── package.json                  # Dependencies & scripts
├── Dockerfile                    # Production Docker build
├── Dockerfile.local              # Local Docker build
├── fly.toml                      # Fly.io deployment config
└── nginx.conf                    # Nginx config for Docker deployment
```

---

## Context Providers

### Core Infrastructure Contexts

#### 1. **SocketContext** (`contexts/SocketContext.tsx`)
Provides singleton Socket.IO client instance.

**Purpose:**
- Manages single WebSocket connection to main server (port 5000)
- Prevents duplicate connections across navigation

**Key Features:**
- Singleton pattern (one socket per user session)
- Persists across navigation (no disconnect on route change)
- Auto-reconnection with exponential backoff

**Usage:**
```tsx
import { useSocket } from '@/contexts/SocketContext';

const socket = useSocket();
// Direct socket access for non-typed events
socket.on('custom-event', handler);
```

**⚠️ Warning:** Prefer `useEventBusCore()` over direct socket access to avoid memory leaks.

---

#### 2. **EventBusCoreContext** (`contexts/EventBusCoreContext.tsx`)
Central event bus with React 19 optimizations. **Zero re-renders.**

**Purpose:**
- Type-safe event subscriptions with automatic cleanup
- Priority-based event handling (`high`, `normal`, `low`)
- Hydration watermark integration to prevent race conditions

**Key Features:**
- **Stable API** - No re-renders when events are emitted
- **Automatic Priority Detection** - Based on channel name patterns
- **React 19 Integration** - Uses `startTransition` for low-priority events
- **Batch Subscriptions** - Subscribe to multiple events at once
- **Memory Leak Prevention** - Automatic cleanup on unmount

**Architecture:**
```tsx
EventBusCoreProvider
  ├─ Socket Listener (REDIS_CHANNELS.*)
  ├─ Handler Registry (Map<channel, handlers[]>)
  ├─ Hydration Queue (holds events until ready)
  └─ Priority Router (high → immediate, low → startTransition)
```

**Usage:**
```tsx
import { useEventBusCore } from '@/contexts/EventBusCoreContext';
import { REDIS_CHANNELS } from '@ems/types';
import { startTransition } from 'react';

const { subscribe, emit } = useEventBusCore();

useEffect(() => {
  // Single subscription
  const unsubscribe = subscribe(
    REDIS_CHANNELS.BET_PLACED,
    (payload) => {
      startTransition(() => {
        updateBets(payload);
      });
    },
    { priority: 'normal' }
  );

  return unsubscribe; // Auto cleanup
}, [subscribe]);
```

**Best Practices:**
```tsx
// ✅ CORRECT: Use EventBusCore for typed Redis channels
const { subscribe } = useEventBusCore();
useEffect(() => {
  return subscribe(REDIS_CHANNELS.BET_PLACED, handler);
}, [subscribe]);

// ❌ WRONG: Direct socket.on() causes memory leaks
socket.on('bet:placed', handler);
```

---

#### 3. **AuthContext** (`contexts/AuthContext.tsx`)
Authentication state and JWT token management.

**Purpose:**
- Manages user authentication state
- Handles JWT access/refresh token flow
- Controls socket connection lifecycle

**State:**
```tsx
{
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isEmailVerified: boolean;
  hasCompletedProfile: boolean;
}
```

**Key Methods:**
```tsx
login(email, password): Promise<void>
register(email, password, username): Promise<void>
logout(): void
refreshAccessToken(): Promise<void>
updateUser(updates: Partial<User>): void
```

**Token Refresh Flow:**
- Axios interceptor detects 401 responses
- Attempts refresh token exchange
- Retries original request with new access token
- Logs out on refresh failure

**Socket Connection Rules:**
1. Socket connects **only when user authenticated**
2. Socket disconnects **only on logout**
3. **Never disconnect on token refresh** (causes duplicate connections)

---

### Domain Contexts

#### 4. **PredictionContext** (`contexts/PredictionContext.tsx`)
Prediction market state and betting functionality.

**State:**
- Active predictions
- User bets (single & parlay)
- Market statistics
- User balance

**Key Features:**
- Optimistic bet placement with rollback on failure
- Real-time bet updates via EventBusCore
- Prediction filtering & search
- Market analytics

---

#### 5. **ChatContext** (`contexts/ChatContext.tsx`)
Global chat system state.

**State:**
- Chat messages (last 100)
- Online users count
- User typing indicators

**Key Features:**
- Real-time message updates
- Rate limiting (1 message per 2 seconds)
- Message history hydration

---

#### 6. **TimelineContext** (`contexts/TimelineContext.tsx`)
Article & feed management.

**State:**
- Timeline articles (RSS/Atom content)
- User bookmarks
- Article reactions
- Trending content

**Key Features:**
- Infinite scroll pagination
- Article filtering by tag
- Bookmark sync across devices
- Use-as-source for predictions

---

#### 7. **AchievementContext** (`contexts/AchievementContext.tsx`)
Achievement system with real-time unlocks.

**State:**
- User achievements (77 total)
- Achievement progress
- Recent unlocks (last 24h)

**Key Features:**
- Real-time achievement celebrations
- Progress tracking
- Achievement categories

---

#### 8. **UserDataContext** (`contexts/UserDataContext.tsx`)
User profile, stats, and analytics.

**State:**
- User profile data
- Betting statistics
- Pong game stats
- Achievement progress

**Key Features:**
- Hydration on mount
- Real-time stat updates
- Profile editing

---

### Utility Contexts

#### 9. **ThemeContext** (`contexts/ThemeContext.tsx`)
Theme management (dark/light mode).

**Features:**
- Theme persistence via localStorage
- Flash prevention (applied before React hydration)
- System theme detection

---

#### 10. **CacheContext** (`contexts/CacheContext.tsx`)
Client-side data caching for API responses.

**Features:**
- In-memory cache with TTL
- Cache invalidation strategies
- Cache hit metrics

---

## Custom Hooks

### Event Subscription Hooks

#### **useBettingEvents** (`hooks/useBettingEvents.ts`)
Subscribe to betting-related events.

**Events:**
- `bet:placed` - New bet placed by any user
- `bet:won` - User won a bet
- `bet:lost` - User lost a bet
- `parlay:placed` - New parlay created
- `prediction:created` - New prediction available
- `prediction:resolved` - Prediction resolved

**Usage:**
```tsx
useBettingEvents({
  onBetPlaced: (bet) => console.log('New bet:', bet),
  onPredictionResolved: (prediction) => {
    // Update local state
  }
});
```

---

#### **useFinancialEvents** (`hooks/useFinancialEvents.ts`)
Subscribe to balance and transaction events.

**Events:**
- `balance:updated` - User balance changed
- `transaction:created` - New transaction recorded

**Usage:**
```tsx
useFinancialEvents({
  onBalanceUpdate: (newBalance) => {
    setBalance(newBalance);
    toast.success(`Balance updated: $${newBalance}`);
  }
});
```

---

#### **usePongEvents** (`hooks/usePongEvents.ts`)
Subscribe to Pong game events.

**Events:**
- `pong:match:created` - New match started
- `pong:match:ended` - Match completed
- `pong:elo:updated` - ELO rating changed

---

#### **useLeaderboardEvents** (`hooks/useLeaderboardEvents.ts`)
Subscribe to leaderboard updates.

**Events:**
- `leaderboard:daily:updated`
- `leaderboard:weekly:updated`
- `leaderboard:all-time:updated`

---

### Utility Hooks

#### **useRoomLifecycle** (`hooks/useRoomLifecycle.ts`)
Automatically join/leave Socket.IO rooms.

**Purpose:**
- Prevents room listener accumulation
- Guarantees cleanup on unmount
- Type-safe room names

**Usage:**
```tsx
const { user } = useAuth();

// Auto join on mount, leave on unmount
useRoomLifecycle([
  `user:${user?.id}`,
  'leaderboard:daily',
  'predictions:active'
].filter(Boolean));
```

**Pattern:**
```
Component Mount  → emit('join-room', room)
Component Unmount → emit('leave-room', room)
```

---

#### **useOptimisticBetting** (`hooks/useOptimisticBetting.ts`)
Optimistic UI updates for bet placement using React 19's `useOptimistic`.

**Features:**
- Instant UI feedback
- Automatic rollback on error
- Balance deduction preview

**Usage:**
```tsx
const { placeBet, optimisticBets } = useOptimisticBetting();

const handleBet = async () => {
  await placeBet(predictionId, optionId, amount);
  // UI updates immediately, reverts on failure
};
```

---

#### **useInfiniteScroll** (`hooks/useInfiniteScroll.ts`)
Infinite scroll pagination with Intersection Observer.

**Usage:**
```tsx
const {
  items,
  loading,
  hasMore,
  observerRef
} = useInfiniteScroll('/api/predictions', {
  limit: 20
});

// Attach ref to last item
<div ref={observerRef}>Loading...</div>
```

---

#### **useDebounce** (`hooks/useDebounce.ts`)
Debounce values for search inputs.

**Usage:**
```tsx
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

---

## Component Organization

### Admin Components (`components/admin/`)

**30+ Admin-only components** for platform management:

#### **User Management**
- `CompactUserList.tsx` - User table with search/filters
- `UserDetailsModal.tsx` - Detailed user profile view
- `BanUserModal.tsx` - Ban/suspend users
- `ChatModerationControls.tsx` - Chat moderation actions
- `BannedUsersWall.tsx` - View banned users

#### **Content Management**
- `FeedsManager.tsx` - RSS feed CRUD operations
- `OPMLManager.tsx` - Import/export OPML feed lists
- `ContentOverview.tsx` - Article moderation queue

#### **Prediction Management**
- `PredictionDashboard.tsx` - All predictions overview
- `PredictionTable.tsx` - Prediction management table
- `ResolvePredictionModal.tsx` - Resolve market outcomes

#### **Financial Monitoring**
- `TransactionsTable.tsx` - All transactions with filters
- `FinancialStatsOverview.tsx` - Revenue/volume metrics

#### **Achievement Management**
- `AdminAchievementDashboard.tsx` - Achievement overview
- `AdminAchievementTable.tsx` - Achievement CRUD
- `RuleBuilder.tsx` - Visual achievement rule editor

---

### Prediction Components (`components/prediction/`)

- `PredictionCard.tsx` - Prediction market card with live odds
- `BettingModal.tsx` - Bet placement UI
- `BetsList.tsx` - User's active bets
- `PredictionComments.tsx` - Discussion thread
- `ParlayBuilder.tsx` - Multi-prediction parlay creator

---

### Pong Components (`components/pong/`)

- `PongLobby.tsx` - Matchmaking lobby
- `PongGame.tsx` - Game canvas with controls
- `PongEloCard.tsx` - ELO rating display
- `PongMatchHistory.tsx` - Match history table
- `EloChart.tsx` - ELO progression graph
- `EloProgressBar.tsx` - Visual ELO indicator

---

### Profile Components (`components/profile/`)

- `ProfileHeader.tsx` - Avatar, bio, follow button
- `ProfileStats.tsx` - Win/loss, ROI, streaks
- `ProfileAchievements.tsx` - Achievement badges
- `ProfileFeed.tsx` - User's posts
- `graphs/` - Data visualization components
  - `WinLossPieChart.tsx`
  - `FinancialBarChart.tsx`
  - `PlayerRadarChart.tsx`
  - `PerformanceProgressBars.tsx`

---

### Timeline Components (`components/timeline/`)

- `TimelineWithPosts.tsx` - Main timeline feed
- `ArticleCard.tsx` - Article preview card
- `ArticleDrawer.tsx` - Full article view
- `CreatePost.tsx` - Post composer
- `TrendingWidget.tsx` - Trending predictions
- `ActivitySummary.tsx` - Recent activity feed
- `BookmarkSystem.tsx` - Bookmarked articles

---

### Shared Components

- `BaseModal.tsx` - Reusable modal wrapper
- `LoadingSpinner.tsx` - Loading indicator
- `PageContainer.tsx` - Page layout wrapper
- `UserBalance.tsx` - Balance display with animations
- `ChatWidget.tsx` - Global chat sidebar
- `EventHandlers.tsx` - Central event router
- `HydrationMarker.tsx` - Hydration watermark manager
- `PrivateRoute.tsx` - Auth guard for protected routes

---

## Real-time Event System

### Architecture Overview

**75+ Redis channels** for real-time updates using a **hybrid EventBus + Socket.IO** architecture.

```
Server (Express)                     Client (React)
     │                                    │
     ├─ Redis Pub/Sub ◄────┐            │
     │   (75+ channels)     │            │
     │                      │            │
     ├─ Socket.IO Server ───┼────────────┤
     │   (broadcasts)       │            │
     │                      │            │
     └─ Emit to room ───────┘            │
                                         │
                         ┌───────────────▼───────────────┐
                         │    EventBusCoreContext        │
                         │  (Central Event Bus)          │
                         └───────────────┬───────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
   ┌────▼─────┐                  ┌───────▼────────┐             ┌────────▼───────┐
   │ Priority │                  │   Hydration    │             │  Room Mgmt     │
   │ Routing  │                  │   Watermark    │             │  (join/leave)  │
   └────┬─────┘                  └───────┬────────┘             └────────────────┘
        │                                │
   high │ immediate               queued │ until ready
   low  │ startTransition                │
        │                                │
   ┌────▼────────────────────────────────▼─────┐
   │     Component Event Subscriptions          │
   │  (useBettingEvents, usePongEvents, etc.)  │
   └────────────────────────────────────────────┘
```

---

### Event Categories & Channels

**75+ Redis channels** organized by domain:

#### **Betting Events** (15 channels)
- `bet:placed`, `bet:won`, `bet:lost`
- `parlay:placed`, `parlay:won`, `parlay:lost`
- `prediction:created`, `prediction:updated`, `prediction:resolved`
- `odds:updated`, `market:volume:updated`

#### **Financial Events** (5 channels)
- `balance:updated`, `transaction:created`
- `payout:processed`, `refund:issued`

#### **Pong Events** (12 channels)
- `pong:match:created`, `pong:match:started`, `pong:match:ended`
- `pong:elo:updated`, `pong:challenge:received`
- `pong:spectators:updated`

#### **Achievement Events** (8 channels)
- `achievement:unlocked`, `achievement:progress`

#### **Leaderboard Events** (9 channels)
- `leaderboard:daily:updated`
- `leaderboard:weekly:updated`
- `leaderboard:all-time:updated`
- `leaderboard:rank:changed`

#### **Social Events** (10 channels)
- `post:created`, `post:updated`, `post:deleted`
- `reaction:added`, `reaction:removed`
- `follow:new`, `follow:removed`

#### **Chat Events** (5 channels)
- `chat:message`, `chat:user:joined`, `chat:user:left`
- `chat:typing`, `chat:message:deleted`

#### **Timeline Events** (7 channels)
- `article:new`, `article:trending`
- `feed:updated`, `bookmark:added`

#### **Admin Events** (4 channels)
- `user:banned`, `user:unbanned`
- `content:moderated`, `system:alert`

---

### Event Priority System

Events are automatically prioritized based on channel patterns:

#### **High Priority** (Immediate Updates)
- Balance changes (`balance:*`)
- Errors (`error:*`)
- Pong game events (`pong:*`)

**Handling:**
```tsx
// High priority: Immediate state update
if (priority === 'high') {
  handler(payload);
}
```

#### **Normal Priority** (Standard Updates)
- Betting events
- Predictions
- Social interactions

**Handling:**
```tsx
// Normal priority: Standard state update
handler(payload);
```

#### **Low Priority** (Non-blocking Updates)
- Analytics
- Metrics
- Leaderboard updates

**Handling:**
```tsx
// Low priority: Non-blocking with startTransition
if (priority === 'low') {
  startTransition(() => {
    handler(payload);
  });
}
```

---

### Hydration Watermark Pattern

**Problem:** Events arrive before React hydration completes → race conditions.

**Solution:** Queue events until hydration is confirmed.

```tsx
// lib/hydrationWatermark.ts
class HydrationWatermark {
  private isReady = false;
  private queue: Event[] = [];

  markReady() {
    this.isReady = true;
    this.queue.forEach(event => this.processEvent(event));
    this.queue = [];
  }

  canProcess(): boolean {
    return this.isReady;
  }
}

// components/HydrationMarker.tsx
useEffect(() => {
  hydrationWatermark.markReady();
}, []);

// EventBusCoreContext.tsx
socket.on('redis:channel:*', (payload) => {
  if (!hydrationWatermark.canProcess()) {
    queueEvent(payload); // Queue until ready
    return;
  }
  processEvent(payload); // Process immediately
});
```

**Benefits:**
- ✅ No missed events during hydration
- ✅ No duplicate state updates
- ✅ Consistent event ordering

---

### Room Lifecycle Management

**Problem:** Components join Socket.IO rooms but forget to leave → listener accumulation.

**Solution:** `useRoomLifecycle` hook for automatic join/leave.

```tsx
// hooks/useRoomLifecycle.ts
export function useRoomLifecycle(rooms: string[]) {
  const socket = useSocket();

  useEffect(() => {
    rooms.forEach(room => socket.emit('join-room', room));

    return () => {
      rooms.forEach(room => socket.emit('leave-room', room));
    };
  }, [rooms, socket]);
}

// Usage in components
function PredictionPage({ predictionId }) {
  useRoomLifecycle([
    `prediction:${predictionId}`,
    'leaderboard:daily'
  ]);

  // Component automatically joins on mount, leaves on unmount
}
```

---

### Event Subscription Best Practices

#### ✅ **DO: Use EventBusCore for typed Redis channels**

```tsx
const { subscribe } = useEventBusCore();

useEffect(() => {
  return subscribe(REDIS_CHANNELS.BET_PLACED, (payload) => {
    // Typed payload, automatic cleanup
    updateBets(payload);
  });
}, [subscribe]);
```

#### ❌ **DON'T: Use direct socket.on()**

```tsx
// WRONG: Memory leaks, no type safety, manual cleanup
socket.on('bet:placed', (payload) => {
  updateBets(payload);
});
// Forgot to call socket.off() → memory leak
```

#### ✅ **DO: Use startTransition for non-critical updates**

```tsx
subscribe(REDIS_CHANNELS.LEADERBOARD_DAILY, (payload) => {
  startTransition(() => {
    setLeaderboard(payload); // Non-blocking
  });
});
```

#### ✅ **DO: Use room lifecycle hooks**

```tsx
useRoomLifecycle([`user:${user?.id}`, 'global']);
```

#### ❌ **DON'T: Forget to clean up rooms**

```tsx
// WRONG: Rooms never left, listeners accumulate
useEffect(() => {
  socket.emit('join-room', 'my-room');
  // Missing return cleanup
}, []);
```

---

## Routing & Navigation

### Route Structure

```tsx
/                     → HomeRedirect (public landing or /timeline if auth)
/login                → Login page
/register             → Register page
/forgot-password      → Password reset request
/reset-password       → Password reset form
/setup-profile        → First-time profile completion

--- Protected Routes (require authentication) ---
/timeline             → Main dashboard (articles + posts)
/predictions          → Prediction market browser
/predictions/:id      → Specific prediction details
/leaderboard          → User rankings (daily/weekly/all-time)
/profile/:userId      → User profile page
/pong                 → Pong game lobby & play

--- Admin Only ---
/admin                → Admin dashboard (requires ADMIN role)
```

### Route Protection

#### **PrivateRoute Component**
Protects authenticated routes:

```tsx
function PrivateRoute() {
  const { user, isLoading, isEmailVerified, hasCompletedProfile } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isEmailVerified) return <Navigate to="/verify-email" replace />;
  if (!hasCompletedProfile) return <Navigate to="/setup-profile" replace />;

  return <Outlet />;
}
```

#### **RequireAdmin Component**
Protects admin-only routes:

```tsx
function RequireAdmin({ children }) {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/timeline" replace />;
  }

  return children;
}
```

### Code Splitting

**All authenticated routes are lazy-loaded:**

```tsx
const Timeline = lazy(() => import('../pages/Timeline'));
const Predictions = lazy(() => import('../pages/Predictions'));
const Leaderboard = lazy(() => import('../pages/Leaderboard'));
const Profile = lazy(() => import('../pages/Profile'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const Pong = lazy(() => import('../pages/Pong'));
```

**Benefits:**
- Faster initial page load (auth pages only)
- Smaller initial bundle size
- Better caching (routes cached independently)

---

## Theme System

### Architecture

**Unified theme system** shared between client and public-site apps.

```
Theme System
├── CSS Variables (semantic tokens)
├── TailwindCSS 4 utilities
├── Dark/Light mode toggle
├── localStorage persistence
└── Flash prevention
```

### Semantic Color Tokens

**All colors use semantic CSS variables:**

```css
:root {
  /* Surface colors */
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-surface-hover: #f1f5f9;

  /* Content colors */
  --color-content: #1e293b;
  --color-content-secondary: #64748b;

  /* Interactive colors */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-accent: #8b5cf6;

  /* Borders */
  --color-border: #e2e8f0;
}

.dark {
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-surface-hover: #334155;
  --color-content: #f1f5f9;
  --color-content-secondary: #cbd5e1;
  --color-primary: #60a5fa;
  --color-primary-hover: #3b82f6;
  --color-accent: #a78bfa;
  --color-border: #334155;
}
```

### Theme Toggle

```tsx
import { useTheme } from '@/theme';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
```

### Flash Prevention

**Theme applied before React hydration** to prevent white flash:

```tsx
// main.tsx (runs before React renders)
(() => {
  const storedTheme = localStorage.getItem('theme') || 'dark';

  if (storedTheme === 'dark' || storedTheme.includes('dark')) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();
```

### Component Theming

```tsx
// ✅ CORRECT: Use semantic theme variables
<div className="bg-surface text-content border-border">
  <button className="bg-primary hover:bg-primary-hover text-white">
    Action
  </button>
</div>

// ❌ WRONG: Hardcoded colors
<div className="bg-white text-gray-900 border-gray-200">
  <button className="bg-blue-600 hover:bg-blue-700 text-white">
    Action
  </button>
</div>
```

---

## State Management Patterns

### 1. **Local State (useState)**
Use for component-specific state that doesn't need to be shared.

```tsx
const [isOpen, setIsOpen] = useState(false);
const [inputValue, setInputValue] = useState('');
```

---

### 2. **Context State**
Use for shared state across multiple components.

```tsx
const { user, balance } = useAuth();
const { predictions } = usePrediction();
```

---

### 3. **Optimistic Updates (useOptimistic)**
Use for immediate UI feedback with server confirmation.

```tsx
const [optimisticBets, addOptimisticBet] = useOptimistic(
  bets,
  (state, newBet) => [...state, newBet]
);

const placeBet = async (bet) => {
  addOptimisticBet(bet); // Immediate UI update

  try {
    await api.placeBet(bet); // Server confirmation
  } catch (error) {
    // Automatic rollback on error
  }
};
```

---

### 4. **Transitions (startTransition)**
Use for non-blocking updates that don't need to be immediate.

```tsx
startTransition(() => {
  setLeaderboard(newData); // Non-blocking
});
```

---

### 5. **Event-Driven Updates (EventBusCore)**
Use for real-time updates from server events.

```tsx
useEffect(() => {
  return subscribe(REDIS_CHANNELS.BET_PLACED, (payload) => {
    startTransition(() => {
      updateBets(payload);
    });
  });
}, [subscribe]);
```

---

## Development

### Prerequisites

- **Node.js ≥24.0.0** (strict requirement)
- **npm 10+**
- **Server running** on port 5000 (for API proxy)
- **Redis running** (for real-time events)

### Environment Variables

Create `.env` in `apps/client/`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:5000

# Server URLs
VITE_SERVER_URL=http://localhost:5000
VITE_PONG_SERVER_URL=http://localhost:5001
VITE_PUBLIC_SITE_URL=http://localhost:5173

# Feature Flags (optional)
VITE_ENABLE_ANALYTICS=false
```

### Development Commands

```bash
# Install dependencies (run from repository root)
npm install

# Start dev server (port 3000)
npm -w apps/client run dev

# Type checking
npm -w apps/client run tsc -- --noEmit

# Linting
npm -w apps/client run lint

# Run tests
npm -w apps/client run test

# Run tests with UI
npm -w apps/client run test:ui
```

### Development Workflow

1. **Start all services** (from root):
   ```bash
   npm run dev
   ```
   This starts:
   - Client app (port 3000)
   - Server (port 5000)
   - Public site (port 5173)
   - Pong server (port 5001)
   - BullMQ workers

2. **Open browser**: http://localhost:3000

3. **Hot Module Replacement (HMR)** is enabled for instant feedback

4. **API Proxy**: All `/api` and `/socket.io` requests are proxied to port 5000

### Debugging

#### **React DevTools**
Install [React Developer Tools](https://react.dev/learn/react-developer-tools) browser extension.

#### **Redux DevTools** (for EventBusCore monitoring)
Not used, but EventBusCore provides built-in metrics:

```tsx
const { getActiveEvents, getHandlerCount } = useEventBusCore();

console.log('Active events:', getActiveEvents());
console.log('Handler count:', getHandlerCount());
```

#### **Socket.IO Client Debugging**
Enable debug mode in browser console:

```js
localStorage.debug = 'socket.io-client:*';
```

#### **Performance Monitoring**
Use React Profiler and Chrome DevTools:

```tsx
import { Profiler } from 'react';

<Profiler id="MyComponent" onRender={onRenderCallback}>
  <MyComponent />
</Profiler>
```

---

## Testing

### Test Setup

- **Framework**: Vitest 3.2.4
- **Utilities**: @testing-library/react 16.1.0
- **DOM**: jsdom 24.1.1

### Running Tests

```bash
# Run all tests
npm -w apps/client run test

# Run tests in watch mode
npm -w apps/client run test -- --watch

# Run tests with UI
npm -w apps/client run test:ui

# Run specific test file
npm -w apps/client run test -- path/to/test.spec.tsx

# Coverage report
npm -w apps/client run test -- --coverage
```

### Test Structure

```
src/
├── components/
│   └── __tests__/
│       └── Component.test.tsx
├── hooks/
│   └── __tests__/
│       └── useHook.test.ts
└── contexts/
    └── __tests__/
        └── Context.test.tsx
```

### Example Test

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BettingModal from '../BettingModal';

describe('BettingModal', () => {
  it('should place bet on submit', async () => {
    const onBet = vi.fn();

    render(
      <BettingModal
        prediction={{ id: 1, title: 'Test' }}
        onBet={onBet}
      />
    );

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '100' }
    });

    fireEvent.click(screen.getByText('Place Bet'));

    expect(onBet).toHaveBeenCalledWith({ amount: 100 });
  });
});
```

### Testing Best Practices

1. **Test user behavior, not implementation**
2. **Use Testing Library queries** (`getByRole`, `getByLabelText`)
3. **Mock API calls** with `vi.mock()`
4. **Test accessibility** (ARIA roles, labels)
5. **Test error states** and edge cases

---

## Build & Deployment

### Production Build

```bash
# Build for production
npm -w apps/client run build

# Output: apps/client/dist/
```

### Build Configuration

**Vite config** (`vite.config.ts`):

```ts
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    build: {
      sourcemap: !isProd, // No source maps in production
      minify: isProd ? 'terser' : false,
      terserOptions: isProd
        ? {
            compress: {
              drop_console: true, // Remove console.log
              drop_debugger: true,
            },
          }
        : undefined,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'socket-vendor': ['socket.io-client'],
            'ui-vendor': ['react-hot-toast', 'react-icons'],
          },
        },
      },
    },
  };
});
```

**Manual Chunk Strategy:**
- `react-vendor.js` - React core (~150KB)
- `socket-vendor.js` - Socket.IO client (~100KB)
- `ui-vendor.js` - UI libraries (~50KB)
- `index.js` - App code (~200KB)

**Benefits:**
- Better caching (vendor chunks change rarely)
- Parallel loading (multiple chunks)
- Faster incremental builds

---

### Docker Deployment

**Multi-stage Docker build** (`Dockerfile`):

```dockerfile
# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build & run Docker image:**

```bash
docker build -t elonmusksucks-client -f apps/client/Dockerfile .
docker run -p 8080:80 elonmusksucks-client
```

---

### Fly.io Deployment

**Configuration** (`fly.toml`):

```toml
app = "elonmusksucks-client"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[[services]]
  http_checks = []
  internal_port = 80
  processes = ["app"]
  protocol = "tcp"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

**Deploy:**

```bash
cd apps/client
fly deploy
```

---

## Performance Optimizations

### 1. **Code Splitting**

**Lazy-loaded routes** reduce initial bundle size:

```tsx
const Timeline = lazy(() => import('../pages/Timeline'));
```

**Before:** 450KB initial bundle
**After:** 150KB initial + 100KB per lazy route

---

### 2. **Manual Chunk Splitting**

**Vendor chunks** improve caching:

```ts
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'socket-vendor': ['socket.io-client'],
  'ui-vendor': ['react-hot-toast', 'react-icons'],
}
```

**Result:**
- Vendor chunks cached for weeks
- App code changes don't invalidate vendor cache

---

### 3. **Virtualized Lists (react-window)**

**Large lists** use windowing for constant performance:

```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={1000}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <BetCard bet={bets[index]} />
    </div>
  )}
</FixedSizeList>
```

**Benefits:**
- Render only visible items (~10-20)
- Constant performance regardless of list size

---

### 4. **React 19 startTransition**

**Non-critical updates** don't block UI:

```tsx
startTransition(() => {
  setLeaderboard(newData); // Non-blocking
});
```

**Result:**
- Smooth scrolling during leaderboard updates
- Input responsiveness maintained

---

### 5. **Debounced Inputs**

**Search inputs** use debouncing to reduce API calls:

```tsx
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

**Result:**
- 90% fewer API calls during typing
- Better server performance

---

### 6. **Image Optimization**

**Avatar images** use optimized formats:

```tsx
<img
  src={avatarUrl}
  alt="Avatar"
  loading="lazy"
  decoding="async"
/>
```

---

### 7. **EventBusCore Zero Re-renders**

**Stable event bus** prevents context re-renders:

```tsx
// EventBusCore uses refs and callbacks - never re-renders
const { subscribe } = useEventBusCore();
// This subscribe function is stable across renders
```

**Result:**
- 75+ events don't cause re-renders
- Event handling <5ms average

---

## Key Patterns & Best Practices

### 1. **Bootstrap Once Pattern**

**Problem:** Fetching same data on every navigation.

**Solution:** Bootstrap on initial mount, then rely on socket events.

```tsx
const [isHydrated, setIsHydrated] = useState(false);

useEffect(() => {
  if (isHydrated || !user?.id) return;

  fetchInitialData().then(() => setIsHydrated(true));
}, [user?.id, isHydrated]);

// Subsequent updates via socket events
useEffect(() => {
  if (!isHydrated) return;

  return subscribe(REDIS_CHANNELS.BET_PLACED, updateBets);
}, [isHydrated, subscribe]);
```

---

### 2. **Hydration Watermark**

**Problem:** Events arrive before React hydration → race conditions.

**Solution:** Queue events until hydration complete.

```tsx
// components/HydrationMarker.tsx
useEffect(() => {
  hydrationWatermark.markReady();
}, []);
```

---

### 3. **Room Lifecycle Management**

**Problem:** Rooms not cleaned up → listener accumulation.

**Solution:** Auto join/leave with hook.

```tsx
useRoomLifecycle([`user:${user?.id}`, 'leaderboard:daily']);
```

---

### 4. **EventBusCore Only**

**Problem:** Direct `socket.on()` causes memory leaks.

**Solution:** Always use EventBusCore.

```tsx
// ✅ CORRECT
const { subscribe } = useEventBusCore();
useEffect(() => {
  return subscribe(REDIS_CHANNELS.BET_PLACED, handler);
}, [subscribe]);

// ❌ WRONG
socket.on('bet:placed', handler);
```

---

### 5. **Optimistic UI with Rollback**

**Problem:** Slow server responses feel laggy.

**Solution:** Update UI immediately, rollback on error.

```tsx
const [optimisticBets, addOptimisticBet] = useOptimistic(bets);

const placeBet = async (bet) => {
  addOptimisticBet(bet); // Instant UI

  try {
    await api.placeBet(bet);
  } catch (error) {
    // Automatic rollback
  }
};
```

---

### 6. **Priority-Based Event Handling**

**Problem:** Low-priority events block high-priority ones.

**Solution:** Use priority system + startTransition.

```tsx
if (priority === 'low') {
  startTransition(() => handler(payload));
} else {
  handler(payload);
}
```

---

### 7. **Semantic Theme Variables**

**Problem:** Hardcoded colors break on theme change.

**Solution:** Use semantic CSS variables.

```tsx
// ✅ CORRECT
className="bg-surface text-content"

// ❌ WRONG
className="bg-white text-gray-900"
```

---

### 8. **Single Socket Connection**

**Problem:** Multiple socket connections per user.

**Solution:** Singleton pattern + connection lifecycle management.

```tsx
// AuthContext manages connection lifecycle
useEffect(() => {
  if (userId && userId !== lastUserId) {
    socket.connect(); // Only on user change
  }
}, [userId]);
```

---

## Troubleshooting

### Issue: Socket not connecting

**Solution:**
1. Check server is running on port 5000
2. Check Redis is running
3. Check JWT token is valid
4. Enable debug: `localStorage.debug = 'socket.io-client:*'`

---

### Issue: Events not received

**Solution:**
1. Check hydration watermark is set
2. Check room is joined
3. Check event channel name matches Redis channel
4. Check EventBusCore subscription is active

---

### Issue: Memory leak warnings

**Solution:**
1. Check all event subscriptions return cleanup function
2. Check rooms are left on unmount
3. Use EventBusCore instead of direct socket.on()

---

### Issue: Theme flash on load

**Solution:**
1. Check theme is applied in `main.tsx` before React renders
2. Check localStorage key is correct (`theme` or `unified_theme_id`)

---

## Additional Resources

- [React 19 Documentation](https://react.dev/)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Main Project README](../../README.md)
- [System Architecture Docs](../../docs/SYSTEM_ARCHITECTURE.md)
- [Design Patterns Docs](../../docs/DESIGN_PATTERNS.md)
- [Event System Review](../../docs/EVENT_SYSTEM_REVIEW.md)

---

## License

See [LICENSE](../../LICENSE) in repository root.
