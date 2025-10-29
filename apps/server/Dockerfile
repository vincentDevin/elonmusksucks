# Dockerfile for elonmusksucks server
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install git (needed for git-based npm dependencies)
# Also install openssl and libc6-compat for Prisma on Alpine
RUN apk add --no-cache git openssl libc6-compat

# Copy root package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/server/package.json ./apps/server/

# Install dependencies for all required workspaces (using npm install since package-lock.json is excluded for cross-platform compatibility)
RUN npm install --workspace=packages/types --workspace=apps/server

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage (workspace dependencies are hoisted to root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy root package files for npm scripts
COPY package*.json ./

# Copy source code
COPY packages/types ./packages/types
COPY apps/server ./apps/server
COPY prisma ./prisma
COPY tsconfig.json ./

# Build shared types
RUN npm run prisma:generate
RUN cd packages/types && npm run build

# Build server (using production tsconfig to exclude tests and jest types)
RUN cd apps/server && npx tsc -p tsconfig.build.json

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies for Prisma on Alpine
# ca-certificates is REQUIRED for SSL connections to managed Postgres
RUN apk add --no-cache openssl libc6-compat ca-certificates

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy built application (workspace dependencies are in root node_modules)
COPY --from=builder --chown=expressjs:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=expressjs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=expressjs:nodejs /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder --chown=expressjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
# Copy generated Prisma client with correct Alpine engines
COPY --from=builder --chown=expressjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=expressjs:nodejs /app/prisma ./prisma
# Add package.json to server dist to specify CommonJS module type
COPY --from=builder --chown=expressjs:nodejs /app/apps/server/package-dist.json ./apps/server/dist/package.json

USER expressjs

# Set working directory to server dist (so Node finds the CommonJS package.json)
WORKDIR /app/apps/server/dist

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/index.js"]
