# Dockerfile for elonmusksucks pong-server
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install git (needed for git-based npm dependencies)
RUN apk add --no-cache git

# Copy root package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/pong-server/package.json ./apps/pong-server/

# Install dependencies (using npm install for cross-platform compatibility)
RUN npm install --workspace=packages/types --workspace=apps/pong-server

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage (workspace dependencies are hoisted to root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy root package files for npm scripts
COPY package*.json ./

# Copy source code
COPY packages/types ./packages/types
COPY apps/pong-server ./apps/pong-server
COPY prisma ./prisma
COPY tsconfig.json ./

# Build shared types
RUN npx prisma generate --schema prisma/schema.prisma
RUN cd packages/types && npm run build

# Build pong server
RUN cd apps/pong-server && npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ponguser

# Copy built application (workspace dependencies are in root node_modules)
COPY --from=builder --chown=ponguser:nodejs /app/apps/pong-server/dist ./apps/pong-server/dist
COPY --from=builder --chown=ponguser:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=ponguser:nodejs /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder --chown=ponguser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=ponguser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ponguser:nodejs /app/prisma ./prisma

# Override module type for compiled CommonJS code
COPY --chown=ponguser:nodejs apps/pong-server/dist-package.json ./apps/pong-server/dist/package.json

USER ponguser

EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "apps/pong-server/dist/src/server.js"]
