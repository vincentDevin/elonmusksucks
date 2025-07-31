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
  "email": "user@example.com",
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
