# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Development Commands

### Root-level commands (monorepo)
- `npm run dev` - Starts client and server concurrently with worker
- `npm run build` - Builds types, client, and server in correct order
- `npm run setup` - Full project setup (install deps, migrate DB, seed, build types)
- `npm run lint` - Lints all TypeScript/React files with ESLint (max 0 warnings)
- `npm run format` - Formats code with Prettier
- `npm test` - Runs all Jest tests
- `npm run test:server` - Runs server-only tests with test environment

### Database commands
- `npm run prisma:generate` - Generates Prisma client (run after schema changes)
- `npm run prisma:migrate:dev` - Resets and applies migrations (development)
- `npm run seed:dev` - Seeds database with development data

### Individual workspace commands
- Client: `npm run dev --workspace=apps/client`, `npm run build --workspace=apps/client`
- Server: `npm run dev --workspace=apps/server`, `npm run worker --workspace=apps/server`

## Architecture Overview

This is a satirical prediction market application built as a monorepo with separate client and server applications.

### Tech Stack
- **Frontend**: Vite + React + TypeScript + TailwindCSS
- **Backend**: Express + TypeScript + Prisma ORM + PostgreSQL
- **Real-time**: Socket.IO for live updates
- **Background Jobs**: Redis + BullMQ for payouts and leaderboards
- **File Storage**: Tigris for profile images
- **Shared Types**: Auto-generated from Prisma schema in `packages/types`

### Key Architecture Patterns

**Event-Driven Real-time Updates**: The application uses Socket.IO with Redis for real-time updates across all clients. All state changes (bets, predictions, chat) are event-driven rather than polling-based.

**Repository Pattern**: Server uses repository pattern with interfaces (`I*Repository.ts`) for data access, making testing and mocking easier.

**Service Layer**: Business logic is separated into service classes that orchestrate between repositories and handle complex operations.

**Background Workers**: Long-running operations like payouts and leaderboard calculations are handled by Redis-backed workers.

### Database Schema (Prisma)
Key entities: User, Prediction, Bet, ParlayLeg, Payout, Message
- Users can create predictions and place bets
- Bets can be standalone or part of parlays
- Real-time messaging system for chat
- Activity tracking for user engagement

### Directory Structure
```
apps/
├── client/src/
│   ├── components/     # React components (organized by feature)
│   ├── contexts/       # React contexts for state management
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Route components
│   ├── api/           # API client functions
│   └── lib/           # Socket.IO client setup
└── server/src/
    ├── controllers/    # Express route handlers
    ├── services/       # Business logic layer
    ├── repositories/   # Data access layer with interfaces
    ├── handlers/       # Socket.IO event handlers
    ├── middleware/     # Express middleware
    ├── workers/        # Background job workers
    └── routes/         # Express route definitions
```

### Socket.IO Integration
- Client connects via SocketContext
- Server handlers organized by feature (chat, betting, activity)
- Redis adapter for scaling across multiple server instances
- Authentication middleware for socket connections

### Testing Strategy
- Unit tests for repositories, services, and controllers
- Integration tests for API endpoints
- Test database using `.env.test` configuration
- Jest configuration supports both unit and integration test suites

### Environment Setup
- All environment variables in root `.env` file
- Requires PostgreSQL and Redis running locally
- Test environment uses separate `.env.test` configuration
- Tigris credentials required for file uploads

### Type Safety
- Shared types package generates TypeScript definitions from Prisma schema
- Strict TypeScript configuration across all workspaces
- ESLint enforces type safety and code quality standards

## Important Notes

- Always run `npm run prisma:generate` after schema changes
- Use `npm run setup` for initial project setup
- Background workers must be running for payouts and leaderboards
- Socket.IO events are the primary mechanism for real-time updates
- Repository interfaces should be used for testing and mocking
- All database operations go through the service layer

---

## 🔒 Authentication and Session Management

### Login Procedure for Testing

1. POST request to `/api/auth/login`:

```json
{
  "email": "user<!-- Import failed: example.com", - Only .md files are supported -->
  "password": "yourPassword"
}
```

2. Receive JWT token:

```json
{
  "token": "<JWT_AUTH_TOKEN>"
}
```

3. Authorization header for future requests:

```
Authorization: Bearer <JWT_AUTH_TOKEN>
```

---

## 📡 WebSocket and Redis Pub/Sub Integration

### WebSocket Usage

* Connect WebSocket: `wss://yourdomain.com/socket`
* Authenticate using JWT token.

### Redis Pub/Sub Channels

* `bet:placed` - Bet events
* `parlay:placed` - Parlay events
* `leaderboard:update` - Leaderboard updates
* `chat:message` - Chat interactions

### Event Workflow

1. Frontend emits via Socket.io
2. Backend handles via Redis Pub/Sub
3. Real-time updates broadcasted to clients

Example Frontend Socket.IO emission:

```typescript
await socketRequest('bet:place', payload);
```

---

## 🧪 Regression and User Testing (Local Environment)

### Local Setup for Testing

* Start backend with Redis and PostgreSQL running
* Launch frontend:

```sh
npm run dev
```

### Monitoring

* WebSocket communication: browser tools or monitoring software
* Redis Pub/Sub channels:

```sh
redis-cli monitor
```

* Verify authentication with API testing tools (Postman, Insomnia)

---

## 📦 Admin Panel Access (for Regression Testing)

* Access admin functionalities at `/admin`
* Requires admin JWT tokens

---

## 🚨 Troubleshooting & Support

* Validate issues via logs, Redis monitor, and WebSocket tools
* Report detailed bugs in project repository

---

## 📁 Architecture Patterns

* **Event-Driven Updates**: Socket.IO with Redis for real-time state
* **Repository Pattern**: `I*Repository.ts` interfaces for easier testing
* **Service Layer**: Complex logic separated into dedicated service classes
* **Background Workers**: Redis for long-running operations

---

## 🛡️ Type Safety

* Auto-generated types from Prisma schema
* Strict TypeScript enforced
* ESLint for quality

---

## UI/UX Modernization and Optimization Plan

### 1. High-Level Goals
- **Modernize the UI:** Refresh the visual design to be more modern, clean, and engaging.
- **Improve Information Hierarchy:** Make it easier for users to scan and understand the most important information.
- **Enhance User Interaction:** Make the dashboard more interactive and intuitive to use.
- **Optimize for Mobile:** Ensure the dashboard is fully responsive and provides a great experience on mobile devices.

### 2. Specific Changes

**a. Layout and Responsiveness:**
- **Mobile-First Approach:** Redesign the layout with a mobile-first approach, ensuring a seamless experience on smaller screens.
- **Tabbed Navigation on Mobile:** On mobile, the two-column layout will be replaced with a tabbed interface. The tabs will be: "Feed", "My Activity", and "Chat". This will make it easier for mobile users to navigate between the different sections.
- **Desktop Layout:** The existing two-column layout will be kept for desktop users, but with improved spacing and alignment.

**b. "My Stuff" Panel (to be renamed "My Activity"):**
- **Consolidation:** The "My Bets", "My Parlays", and "My Predictions" sections will be combined into a single, filterable list.
- **Filtering:** Users will be able to filter their activity by type (bets, parlays, predictions) and status (open, resolved).
- **Visual Polish:** The design of the list items will be improved to be more visually appealing and easier to scan.

**c. Predictions Panel (to be renamed "Prediction Feed"):**
- **Infinite Scroll:** The current pagination will be replaced with an infinite scroll, which will provide a more seamless browsing experience.
- **Visual Redesign:** The `UnifiedPredictionCard` component will be redesigned to be more compact and visually engaging.
- **Filtering and Sorting:** Users will be able to filter the prediction feed by category and sort by "ending soon" and "newest".

**d. Parlay Builder Panel:**
- **Improved UX:** The Parlay Builder will be redesigned to be more intuitive and user-friendly.
- **Visual Polish:** The design of the panel will be updated to match the new modern aesthetic.

**e. Chat Panel:**
- **No changes:** The chat panel will remain as is.

### 3. Implementation Plan

1. **Update `Dashboard.tsx`:**
    - Implement the new mobile-first layout with tabbed navigation.
    - Rename the panels to reflect their new names.
2. **Update `MyStuffPanel.tsx`:**
    - Combine the three lists into a single, filterable list.
    - Add filtering controls.
    - Redesign the list items.
3. **Update `PredictionPanel.tsx`:**
    - Implement infinite scroll.
    - Redesign the `UnifiedPredictionCard` component.
    - Add filtering and sorting controls.
4. **Update `ParlayPanel.tsx`:**
    - Redesign the panel to be more intuitive and user-friendly.

