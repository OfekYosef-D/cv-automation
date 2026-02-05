# Deployment Guide

This document covers deploying the CV Automation application to production.

## Architecture Overview

The application consists of four services:

| Service | Description | Port |
|---------|-------------|------|
| **Web** | Next.js frontend | 3000 |
| **API** | NestJS backend | 3001 |
| **Worker** | Background job processor | N/A |
| **Postgres** | Primary database | 5432 |
| **Redis** | Job queue (BullMQ) | 6379 |

## Deployment Options

### Option 1: Docker Compose (Self-hosted)

Best for: VPS, dedicated servers, or on-premise deployment.

#### Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- 2GB RAM minimum
- Domain with SSL (recommended)

#### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/cv-automation.git
   cd cv-automation
   ```

2. **Create environment file**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with production values:

   ```env
   # Database
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your-secure-password
   POSTGRES_DB=cv_automation
   DATABASE_URL=postgresql://postgres:your-secure-password@postgres:5432/cv_automation?schema=public

   # Redis
   REDIS_URL=redis://redis:6379

   # API
   PORT=3001

   # WorkOS AuthKit (get from WorkOS dashboard)
   WORKOS_API_KEY=sk_xxxxx
   WORKOS_CLIENT_ID=client_xxxxx

   # URLs
   API_URL=https://api.yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
   NEXT_PUBLIC_TENANT_ID=t1
   ```

3. **Build and start services**

   ```bash
   docker compose -f docker-compose.prod.yml build
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Run database migrations**

   ```bash
   docker compose -f docker-compose.prod.yml run --rm migrate
   ```

5. **Verify deployment**

   ```bash
   # Check service health
   curl http://localhost:3001/health
   curl http://localhost:3000

   # View logs
   docker compose -f docker-compose.prod.yml logs -f
   ```

#### Updating

```bash
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml run --rm migrate
```

### Option 2: Platform-as-a-Service

Recommended platforms by service:

| Service | Recommended Platform | Alternative |
|---------|---------------------|-------------|
| **Web** | Vercel | Netlify, Cloudflare Pages |
| **API** | Railway | Render, Fly.io |
| **Worker** | Railway | Render |
| **Database** | Supabase | Railway, Neon |
| **Redis** | Upstash | Railway |

#### Deploying to Vercel (Web)

1. Connect your GitHub repository to Vercel
2. Set the root directory to `apps/web`
3. Add environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` = your API URL
   - `NEXT_PUBLIC_TENANT_ID` = your tenant ID

#### Deploying to Railway (API + Worker)

1. Create a new project in Railway
2. Add a PostgreSQL database
3. Add a Redis instance
4. Deploy API from GitHub:
   - Set root directory: `apps/api`
   - Dockerfile path: `apps/api/Dockerfile`
   - Add environment variables from `.env.example`
5. Deploy Worker similarly with `apps/worker/Dockerfile`

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `WORKOS_API_KEY` | WorkOS API key (sk_xxx) |
| `WORKOS_CLIENT_ID` | WorkOS client ID (client_xxx) |

### URLs

| Variable | Description |
|----------|-------------|
| `API_URL` | API base URL (for OAuth callbacks) |
| `FRONTEND_URL` | Web app URL for redirects |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | API port |
| `NEXT_PUBLIC_TENANT_ID` | t1 | Default tenant ID |

## Setting Up WorkOS AuthKit

WorkOS AuthKit provides a hosted authentication UI with Google, GitHub, Microsoft, and more.

### Initial Setup

1. Go to [WorkOS Dashboard](https://dashboard.workos.com) and create an account (free up to 1M users)
2. Create a new organization
3. Navigate to **Authentication** > **AuthKit**
4. Copy your **API Key** and **Client ID** to your `.env`

### Configure Redirect URIs

1. In the WorkOS dashboard, go to **Redirects**
2. Add your callback URL: `https://api.yourdomain.com/auth/callback`
3. For local development, also add: `http://localhost:3001/auth/callback`

### Enable Social Providers

1. Go to **Authentication** > **Providers**
2. Enable providers you want (Google, GitHub, Microsoft, etc.)
3. Each provider requires its own OAuth app credentials:
   - **Google**: [Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Credentials
   - **GitHub**: [GitHub Developer Settings](https://github.com/settings/developers) > OAuth Apps
   - **Microsoft**: [Azure Portal](https://portal.azure.com) > App Registrations
4. Add the credentials to WorkOS dashboard (not your app's `.env`)

### Authentication Flow

1. User clicks "Login" in your app
2. Your app redirects to `/auth/login`
3. API redirects to WorkOS hosted login page
4. User signs in with their preferred provider
5. WorkOS redirects to `/auth/callback` with authorization code
6. API exchanges code for tokens and creates/updates user in database
7. API redirects to frontend with access token

### JWT Verification

WorkOS issues JWTs signed with RS256. The API verifies tokens using WorkOS's public JWKS endpoint. No local JWT secret is needed.

## Database Migrations

Run migrations after deployment or when schema changes:

```bash
# Docker Compose
docker compose -f docker-compose.prod.yml run --rm migrate

# Railway/Render (via Railway CLI)
railway run npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma
```

## Monitoring

### Health Checks

- API: `GET /health` returns `{ "status": "ok" }`
- Web: Root path should return 200

### Logs

```bash
# Docker Compose
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker
docker compose -f docker-compose.prod.yml logs -f web

# Railway
railway logs
```

## Scaling

### Horizontal Scaling

- **Web**: Stateless, scale freely
- **API**: Stateless, scale freely
- **Worker**: Can run multiple instances (BullMQ handles distribution)

### Recommended Resources

| Service | CPU | Memory |
|---------|-----|--------|
| Web | 0.5 | 512MB |
| API | 1 | 1GB |
| Worker | 0.5 | 512MB |
| Postgres | 1 | 2GB |
| Redis | 0.25 | 256MB |

## Troubleshooting

### Common Issues

**WorkOS redirect mismatch**
- Ensure `API_URL` matches the redirect URI configured in WorkOS dashboard
- Check for trailing slashes
- Verify both production and development URLs are added in WorkOS

**Database connection refused**
- Ensure PostgreSQL is running and healthy
- Check `DATABASE_URL` format
- Verify network connectivity between services

**JWT verification errors**
- Ensure `WORKOS_CLIENT_ID` is correctly set
- Check that the token hasn't expired
- Verify the JWKS endpoint is accessible from your server

### Debug Mode

Set `LOG_LEVEL=debug` for verbose logging:

```bash
docker compose -f docker-compose.prod.yml up -d -e LOG_LEVEL=debug
```
