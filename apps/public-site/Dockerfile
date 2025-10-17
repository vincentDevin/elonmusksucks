# Dockerfile for elonmusksucks public-site (SSR)
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install git (needed for git-based npm dependencies)
RUN apk add --no-cache git

# Copy root package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/public-site/package.json ./apps/public-site/
COPY apps/server/package.json ./apps/server/

# Install dependencies (using npm install for cross-platform compatibility)
# Include server workspace to get ioredis and other types dependencies
RUN npm install --workspace=packages/types --workspace=apps/public-site --workspace=apps/server

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage (workspace dependencies are hoisted to root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy root package files for npm scripts
COPY package*.json ./

# Copy source code
COPY packages/types ./packages/types
COPY apps/public-site ./apps/public-site
COPY prisma ./prisma
COPY tsconfig.json ./

# Build shared types
RUN npx prisma generate --schema prisma/schema.prisma
RUN cd packages/types && npm run build

# Build public site (SSR)
RUN cd apps/public-site && npm run build

# Production stage (SSR server)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 publicuser

# Copy built application (workspace dependencies are in root node_modules)
COPY --from=builder --chown=publicuser:nodejs /app/apps/public-site/dist ./apps/public-site/dist
COPY --from=builder --chown=publicuser:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=publicuser:nodejs /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder --chown=publicuser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=publicuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=publicuser:nodejs /app/apps/public-site/server.ts ./apps/public-site/server.ts
COPY --from=builder --chown=publicuser:nodejs /app/apps/public-site/index.html ./apps/public-site/index.html
COPY --from=builder --chown=publicuser:nodejs /app/apps/public-site/src ./apps/public-site/src
COPY --from=builder --chown=publicuser:nodejs /app/prisma ./prisma

USER publicuser

EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5173/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# SSR server uses tsx to run TypeScript
CMD ["npx", "tsx", "apps/public-site/server.ts"]
