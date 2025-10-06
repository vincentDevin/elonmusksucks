# New Developer Setup Guide

Welcome to **elonmusksucks.net**! This guide will walk you through setting up the complete development environment on macOS.

## Table of Contents

- [Prerequisites](#prerequisites)
- [System Dependencies](#system-dependencies)
- [Project Setup](#project-setup)
- [Database Configuration](#database-configuration)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Common Issues & Debugging](#common-issues--debugging)
- [Useful Commands](#useful-commands)
- [Automated Setup Script](#automated-setup-script)

## Prerequisites

### Node.js Version Manager (Recommended)

This project **requires Node.js e24.0.0**. We recommend using `nvm` (Node Version Manager) for easy version management:

```bash
# Install nvm if not already installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart your terminal or source your profile
source ~/.zshrc  # or ~/.bash_profile for bash

# Install and use Node.js 24
nvm install 24
nvm use 24

# Verify installation
node --version  # Should be v24.x.x
npm --version   # Should be 10.x.x or higher
```

### Homebrew

Homebrew is the package manager for macOS. If you don't have it installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## System Dependencies

### 1. Install PostgreSQL

PostgreSQL is our primary database.

```bash
# Install PostgreSQL 15 via Homebrew
brew install postgresql@15

# Add PostgreSQL to your PATH (add this to ~/.zshrc or ~/.bash_profile)
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version  # Should show PostgreSQL 15.x
```

### 2. Create Database

```bash
# Connect to PostgreSQL as the default user
psql postgres

# In the PostgreSQL prompt, run:
CREATE DATABASE elonmusksucks;
CREATE USER elonmusksucks_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE elonmusksucks TO elonmusksucks_user;

# Exit PostgreSQL prompt
\q
```

**Alternative (simpler for local dev):**

```bash
# Create database using your system user
createdb elonmusksucks

# Test connection
psql -d elonmusksucks
\q
```

### 3. Install Redis

Redis is used for Socket.IO adapter, session management, and BullMQ job queues.

```bash
# Install Redis via Homebrew
brew install redis

# Start Redis service
brew services start redis

# Verify installation
redis-cli ping  # Should return "PONG"
```

**Manual Redis Start (if needed):**

```bash
# Start Redis in foreground (for debugging)
redis-server

# Or start as background service
brew services start redis

# Check Redis status
brew services list | grep redis
```

## Project Setup

### 1. Clone the Repository

```bash
git clone <repository-url> elonmusksucks
cd elonmusksucks
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install

# This installs dependencies for:
# - Root workspace
# - apps/client
# - apps/public-site
# - apps/server
# - apps/pong-server
# - packages/types
```

### 3. Build Shared Packages

The `packages/types` package must be built before other apps can use it:

```bash
# Build types package
npm run build:types

# Or run the full build (builds all packages)
npm run build
```

## Database Configuration

### 1. Environment Variables

Create a `.env` file in the **root directory**:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Database (adjust username/password if needed)
DATABASE_URL=postgresql://postgres@localhost:5432/elonmusksucks
# Or if you created a specific user:
# DATABASE_URL=postgresql://elonmusksucks_user:your_secure_password@localhost:5432/elonmusksucks

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (CHANGE THESE!)
ACCESS_TOKEN_SECRET=generate_a_random_32_character_string_here_for_access
REFRESH_TOKEN_SECRET=generate_a_random_32_character_string_here_for_refresh

# Application URLs (local development)
CLIENT_APP_URL=http://localhost:3000
BASE_URL_CLIENT=http://localhost:3000
BASE_URL_SERVER=http://localhost:5000
BASE_URL_PUBLIC=http://localhost:5173
API_BASE_URL=http://localhost:5000

# Tigris S3 Storage (optional for local dev, but required for production)
TIGRIS_S3_ENDPOINT=https://fly.storage.tigris.dev
TIGRIS_ACCESS_KEY_ID=tid_your_access_key
TIGRIS_SECRET_ACCESS_KEY=tsec_your_secret_key
TIGRIS_S3_BUCKET=your_bucket_name

# Email (optional - can skip for local dev)
SKIP_EMAIL_FLOW=true
SENDGRID_API_KEY=SG.optional_sendgrid_key
FROM_EMAIL=noreply@elonmusksucks.net

# Optional
BCRYPT_SALT_ROUNDS=12
GAME_SERVER_SECRET=pong-internal-secret-change-in-production
```

**Generate Secure Secrets:**

```bash
# Generate random 32-character secrets for JWT
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Run this twice - once for ACCESS_TOKEN_SECRET, once for REFRESH_TOKEN_SECRET
```

### 2. Prisma Setup

Prisma is our ORM for PostgreSQL. Here's how to use it:

```bash
# Generate Prisma Client (must run after any schema changes)
npx prisma generate

# Create and apply migrations to database
npx prisma migrate dev

# This will:
# 1. Create migration files
# 2. Apply them to the database
# 3. Regenerate Prisma Client

# Alternative: Reset database (WARNING: deletes all data)
npx prisma migrate reset

# This will:
# 1. Drop the database
# 2. Recreate it
# 3. Apply all migrations
# 4. Run seed scripts (if configured)
```

### 3. Seed Development Data

```bash
# Seed initial development data
npm run seed:dev

# Seed achievements (77 achievements across 8 categories)
npm run seed:achievements

# Or use the all-in-one setup script
npm run setup
```

**What does `npm run setup` do?**

```bash
# It runs these commands in sequence:
# 1. npm install
# 2. npm run build:types
# 3. npx prisma generate
# 4. npx prisma migrate dev
# 5. npm run seed:dev
# 6. npm run seed:achievements
```

## Running the Application

### Start All Services

```bash
# Start everything (client, public-site, server, pong-server, workers)
npm run dev
```

This starts:
- **Client App** (React SPA): http://localhost:3000
- **Public Site** (SSR): http://localhost:5173
- **Server** (Express API): http://localhost:5000
- **Pong Server**: http://localhost:5001
- **BullMQ Workers**: Background jobs

### Start Individual Services

```bash
# Client app only
npm -w apps/client run dev

# Server only
npm -w apps/server run dev

# Public site only
npm -w apps/public-site run dev

# Pong server only
npm -w apps/pong-server run dev

# Workers only
npm -w apps/server run worker
```

### Verify Everything is Running

1. **Client App**: Visit http://localhost:3000 - You should see the login page
2. **Public Site**: Visit http://localhost:5173 - You should see the landing page
3. **Server API**: Visit http://localhost:5000/health - Should return `{"status":"ok"}`
4. **Redis**: Run `redis-cli ping` - Should return "PONG"
5. **PostgreSQL**: Run `psql -d elonmusksucks -c "SELECT 1"` - Should return "1"

## Common Issues & Debugging

### Issue: "Port already in use"

```bash
# Find process using port 3000 (or 5000, 5001, 5173)
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port by setting environment variables
PORT=3001 npm -w apps/client run dev
```

### Issue: "Cannot connect to database"

```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Restart PostgreSQL
brew services restart postgresql@15

# Test connection manually
psql -d elonmusksucks

# Check your DATABASE_URL in .env matches your setup
```

### Issue: "Redis connection failed"

```bash
# Check Redis is running
redis-cli ping

# Restart Redis
brew services restart redis

# Check Redis logs
tail -f /opt/homebrew/var/log/redis.log
```

### Issue: "Prisma Client is not generated"

```bash
# Regenerate Prisma Client
npx prisma generate

# If types are still missing, rebuild types package
npm run build:types
```

### Issue: "Module not found: @elonmusksucks/types"

```bash
# The types package needs to be built first
npm run build:types

# Then restart your dev server
npm run dev
```

### Issue: TypeScript errors after schema changes

```bash
# After modifying prisma/schema.prisma:

# 1. Generate new Prisma Client
npx prisma generate

# 2. Rebuild types package
npm run build:types

# 3. Restart dev servers
npm run dev
```

### Issue: Database schema out of sync

```bash
# Option 1: Create a new migration
npx prisma migrate dev --name describe_your_changes

# Option 2: Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Option 3: Push schema without migration (for prototyping)
npx prisma db push
```

### Issue: "Node version mismatch"

```bash
# Check current Node version
node --version

# If not 24.x.x, install correct version
nvm install 24
nvm use 24

# Set default Node version
nvm alias default 24
```

### Debugging TypeScript Issues

```bash
# Check TypeScript errors in each app
npm -w apps/server run tsc -- --noEmit
npm -w apps/client run tsc -- --noEmit
npm -w apps/public-site run tsc -- --noEmit

# Run linting
npm run lint

# Fix auto-fixable lint errors
npm run lint -- --fix
```

### Viewing Logs

```bash
# Server logs (shows API requests, Socket.IO events, errors)
npm -w apps/server run dev

# Worker logs (shows background job processing)
npm -w apps/server run worker

# Redis monitor (shows all Redis commands in real-time)
redis-cli monitor

# PostgreSQL logs
tail -f /opt/homebrew/var/log/postgresql@15.log
```

## Useful Commands

### Database Management

```bash
# Open Prisma Studio (GUI for database)
npx prisma studio

# View database schema
npx prisma db pull

# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Create migration without applying
npx prisma migrate dev --create-only

# View migration status
npx prisma migrate status

# Deploy migrations (production)
npx prisma migrate deploy
```

### Testing

```bash
# Run all tests
npm test

# Run server tests only
npm run test:server

# Run client tests only
npm -w apps/client run test

# Run tests in watch mode
npm -w apps/client run test

# Run tests with UI
npm -w apps/client run test:ui
```

### Code Quality

```bash
# Linting
npm run lint                    # Check all files
npm run lint -- --fix           # Auto-fix issues

# Formatting
npm run format                  # Format with Prettier

# Type checking (without building)
npm -w apps/server run tsc -- --noEmit
npm -w apps/client run tsc -- --noEmit
npm -w apps/public-site run tsc -- --noEmit
```

### Building

```bash
# Build everything
npm run build

# Build individual apps
npm -w apps/client run build
npm -w apps/server run build
npm -w apps/public-site run build
npm -w apps/pong-server run build

# Build types package only
npm run build:types
```

### Workspace Commands

```bash
# Install package in specific workspace
npm install -w apps/server express

# Run script in specific workspace
npm -w apps/client run build

# List all workspaces
npm ls --workspaces
```

## Automated Setup Script

For a one-shot setup experience, use our automated setup script:

```bash
# Run the automated setup script
./scripts/setup-dev-environment.sh
```

This script will:
1. Check for Homebrew and install if missing
2. Install PostgreSQL and Redis
3. Start database services
4. Create the database
5. Install npm dependencies
6. Set up environment variables
7. Run Prisma migrations
8. Seed development data
9. Build all packages

**Manual Setup vs Automated Script:**

- **Manual Setup**: Follow this guide step-by-step for better understanding
- **Automated Script**: Quick setup for experienced developers or CI/CD

## Next Steps

After setup is complete:

1. **Create a test user**: Visit http://localhost:3000 and register a new account
2. **Explore the admin panel**: Set yourself as admin in the database and visit http://localhost:3000/admin
3. **Review the architecture**: Read `CLAUDE.md` for architecture patterns and guidelines
4. **Check out the schema**: Open `prisma/schema.prisma` to understand the data model
5. **Review the README**: Read `README.md` for feature overview

## Getting Help

- **Architecture Questions**: See `CLAUDE.md`
- **Feature Overview**: See `README.md`
- **API Documentation**: Check `apps/server/src/routes/`
- **Database Schema**: Check `prisma/schema.prisma`
- **Socket Events**: Check `packages/types/src/api/socket/events.ts`

## Development Workflow

### Typical Development Flow

1. **Start services**: `npm run dev`
2. **Make code changes**: Edit files in `apps/` or `packages/`
3. **If you modify Prisma schema**:
   ```bash
   npx prisma migrate dev --name your_migration_name
   npm run build:types  # Rebuild types
   ```
4. **If you modify shared types**:
   ```bash
   npm run build:types  # Rebuild types package
   ```
5. **Run tests**: `npm test`
6. **Commit changes**: Follow conventional commits format
   ```bash
   git commit -m "feat(client): add new feature"
   ```

### Git Workflow

```bash
# Create feature branch
git checkout -b feat/your-feature-name

# Make changes and commit
git add .
git commit -m "feat(scope): description"

# Push to remote
git push origin feat/your-feature-name

# Create pull request on GitHub
```

### Commit Message Format

```
type(scope): message

Types: feat, fix, docs, style, refactor, test, chore
Scopes: client, server, pong, theme, auth, types, database

Examples:
feat(client): add dark mode theme toggle
fix(server): resolve race condition in bet processing
docs(setup): update onboarding instructions
refactor(pong): simplify game loop logic
```

## Architecture Quick Reference

### Dual-Application Architecture

- **Client App** (`apps/client`): Authenticated SPA for logged-in users
- **Public Site** (`apps/public-site`): SSR marketing site for SEO/public content
- **Server** (`apps/server`): Unified Express backend serving both frontends
- **Pong Server** (`apps/pong-server`): Dedicated game server

### Backend Layering

```
HTTP Request ’ Routes ’ Controllers ’ Services ’ Repositories ’ Prisma ’ PostgreSQL
Socket Event ’ Handlers ’ Services ’ Repositories ’ Prisma ’ PostgreSQL
```

**Key Rules:**
- L No Prisma in routes/controllers/services - Use repositories
- L No enums in shared types - Use `as const` objects
- L No direct Socket.IO/Redis in routes/controllers - Use dependency injection
-  Always use EventBusCore for socket events in React components

### Real-time System

- **75+ Redis channels** for real-time updates
- **EventBusCore**: Central event bus with React 19 optimizations
- **Socket.IO**: Client-server communication
- **Redis Pub/Sub**: Cross-server event distribution

## Environment Checklist

Before you start developing, verify:

- [ ] Node.js e24.0.0 installed
- [ ] PostgreSQL 15 installed and running
- [ ] Redis installed and running
- [ ] Database `elonmusksucks` created
- [ ] `.env` file configured in root
- [ ] Dependencies installed (`npm install`)
- [ ] Types package built (`npm run build:types`)
- [ ] Prisma migrations applied (`npx prisma migrate dev`)
- [ ] Development data seeded (`npm run seed:dev`)
- [ ] All services start successfully (`npm run dev`)

Welcome to the team! =€
