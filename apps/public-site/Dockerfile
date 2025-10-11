# Dockerfile for elonmusksucks public-site (SSR)
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/public-site/package.json ./apps/public-site/

# Install dependencies
RUN npm ci --workspace=apps/public-site

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/public-site/node_modules ./apps/public-site/node_modules

# Copy source code
COPY packages/types ./packages/types
COPY apps/public-site ./apps/public-site
COPY prisma ./prisma
COPY tsconfig.json ./

# Build shared types
RUN npm run prisma:generate
RUN cd packages/types && npm run build

# Build public site (SSR)
WORKDIR /app/apps/public-site
RUN npm run build

# Production stage (SSR server)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 publicuser

# Copy built application
COPY --from=builder --chown=publicuser:nodejs /app/apps/public-site/dist ./apps/public-site/dist
COPY --from=builder --chown=publicuser:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=publicuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=publicuser:nodejs /app/apps/public-site/node_modules ./apps/public-site/node_modules
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
