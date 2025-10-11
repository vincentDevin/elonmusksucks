# Dockerfile for elonmusksucks client (SPA)
# Multi-stage build: Build stage -> Nginx serving stage

FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/client/package.json ./apps/client/

# Install dependencies
RUN npm ci --workspace=apps/client

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/client/node_modules ./apps/client/node_modules

# Copy source code
COPY packages/types ./packages/types
COPY apps/client ./apps/client
COPY prisma ./prisma
COPY tsconfig.json ./

# Build shared types
RUN npm run prisma:generate
RUN cd packages/types && npm run build

# Build client app
WORKDIR /app/apps/client
RUN npm run build

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
