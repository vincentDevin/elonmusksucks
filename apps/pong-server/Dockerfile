# Dockerfile for elonmusksucks pong-server
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/pong-server/package.json ./apps/pong-server/

# Install dependencies
RUN npm ci --workspace=apps/pong-server

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/pong-server/node_modules ./apps/pong-server/node_modules

# Copy source code
COPY packages/types ./packages/types
COPY apps/pong-server ./apps/pong-server
COPY prisma ./prisma
COPY tsconfig.json ./

# Build shared types
RUN npm run prisma:generate
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

# Copy built application
COPY --from=builder --chown=ponguser:nodejs /app/apps/pong-server/dist ./apps/pong-server/dist
COPY --from=builder --chown=ponguser:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=ponguser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ponguser:nodejs /app/apps/pong-server/node_modules ./apps/pong-server/node_modules
COPY --from=builder --chown=ponguser:nodejs /app/prisma ./prisma

USER ponguser

EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "apps/pong-server/dist/server.js"]
