# ===============================
# API Dockerfile (NestJS)
# ===============================
# Multi-stage build for smaller final image

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/matching/package.json ./packages/matching/
COPY packages/observability/package.json ./packages/observability/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN npm install -g pnpm@9

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm --filter @cv/db generate

# Build shared packages
RUN pnpm --filter @cv/matching build

# Build the API
RUN pnpm --filter @cv/api build

# Stage 3: Runner
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy package files for production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/matching/package.json ./packages/matching/
COPY packages/observability/package.json ./packages/observability/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/matching/dist ./packages/matching/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client* ./node_modules/.pnpm/

# Copy Prisma schema for migrations
COPY packages/db/prisma ./packages/db/prisma

USER nestjs

EXPOSE 3001

ENV PORT=3001

CMD ["node", "apps/api/dist/main.js"]
