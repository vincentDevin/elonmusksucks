# Dockerfile for elonmusksucks client (SPA)
# Multi-stage build: Build stage -> Nginx serving stage

FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install git (needed for git-based npm dependencies)
RUN apk add --no-cache git

# Copy root package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/client/package.json ./apps/client/
COPY apps/server/package.json ./apps/server/
COPY apps/pong-server/package.json ./apps/pong-server/
COPY apps/public-site/package.json ./apps/public-site/

# Install dependencies (using npm install for cross-platform compatibility)
# Include server workspace to get ioredis and other types dependencies
# Also install root dependencies (recharts, etc.)
RUN npm install

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage (workspace dependencies are hoisted to root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy root package files for npm scripts
COPY package*.json ./

# Copy source code
COPY packages/types ./packages/types
COPY apps/client ./apps/client
COPY prisma ./prisma
COPY tsconfig.json ./

# Build shared types
RUN npx prisma generate --schema prisma/schema.prisma
RUN cd packages/types && npm run build

# ══════════════════════════════════════════════════════════════════════════════
# Build Arguments - Production URLs
# ══════════════════════════════════════════════════════════════════════════════
# These ARGs are passed during docker build and converted to ENV variables
# that Vite reads during the build process
# ══════════════════════════════════════════════════════════════════════════════

ARG VITE_API_BASE_URL=https://api.elonmusksucks.net
ARG VITE_SOCKET_URL=https://api.elonmusksucks.net
ARG VITE_PUBLIC_SITE_URL=https://elonmusksucks.net
ARG VITE_PONG_SERVER_URL=https://pong.elonmusksucks.net
ARG VITE_FEATURE_PONG_BETA=false
ARG VITE_FEATURE_ENHANCED_CHAT=false
ARG VITE_FEATURE_ADVANCED_ANALYTICS=false
ARG VITE_FEATURE_EXPERIMENTAL_UI=false

# Convert ARGs to ENV variables so Vite can read them during build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL
ENV VITE_PONG_SERVER_URL=$VITE_PONG_SERVER_URL
ENV VITE_FEATURE_PONG_BETA=$VITE_FEATURE_PONG_BETA
ENV VITE_FEATURE_ENHANCED_CHAT=$VITE_FEATURE_ENHANCED_CHAT
ENV VITE_FEATURE_ADVANCED_ANALYTICS=$VITE_FEATURE_ADVANCED_ANALYTICS
ENV VITE_FEATURE_EXPERIMENTAL_UI=$VITE_FEATURE_EXPERIMENTAL_UI

# Debug: Show environment variables that Vite will see
RUN echo "=== Building client with the following configuration ===" && \
    echo "VITE_API_BASE_URL: $VITE_API_BASE_URL" && \
    echo "VITE_SOCKET_URL: $VITE_SOCKET_URL" && \
    echo "VITE_PUBLIC_SITE_URL: $VITE_PUBLIC_SITE_URL" && \
    echo "VITE_PONG_SERVER_URL: $VITE_PONG_SERVER_URL"

# Build client with production mode
RUN cd apps/client && NODE_ENV=production npm run build

# Production stage - Use Nginx to serve static files
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
