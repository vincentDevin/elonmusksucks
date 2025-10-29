# Multi-stage Dockerfile for Achievement Server
# Stage 1: Builder - Install dependencies and compile TypeScript
# Stage 2: Runner - Minimal production image

FROM node:24-alpine AS builder

WORKDIR /app

# Copy root package files and tsconfig
COPY package*.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/types ./packages/types
COPY apps/achievement-server ./apps/achievement-server

# Copy Prisma schema (needed for client generation)
COPY prisma ./prisma

# Install ALL dependencies (including devDependencies for building)
RUN npm install

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build types package
RUN cd packages/types && npm run build

# Build achievement-server
RUN cd apps/achievement-server && npm run build

# ============================================================================
# Stage 2: Production Runner
# ============================================================================

FROM node:24-alpine AS runner

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY packages/types/package*.json ./packages/types/
COPY apps/achievement-server/package*.json ./apps/achievement-server/

# Install ONLY production dependencies
RUN npm install --omit=dev

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy built artifacts from builder
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/apps/achievement-server/dist ./apps/achievement-server/dist

# Set working directory to achievement-server
WORKDIR /app/apps/achievement-server

# Expose health check port (internal only, not public)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the achievement server
CMD ["node", "dist/index.js"]
