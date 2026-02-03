# Onboarding

Welcome! This guide helps you continue work quickly and safely.

## Prerequisites
- Node.js 20+
- pnpm 9
- Docker Desktop (for Postgres)

## First-time setup
1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Start Postgres: `docker compose up -d`.
3. Install dependencies: `pnpm install`.
4. Generate Prisma client: `pnpm -C packages/db prisma generate`.

## Run the apps
- **All**: `pnpm dev` (API + web + worker)
- Or individually: `pnpm dev:api`, `pnpm dev:web`, `pnpm dev:worker`

## Run tests
- All: `pnpm test`
- API e2e: `pnpm -C apps/api test:e2e`
- Web: `pnpm -C apps/web test`

## Where to continue
- Plan: `docs/plans/2026-01-31-approval-console-data-wiring-tailwind-shadcn-plan.md`
- Current tasks are tracked as GitHub issues.

## Troubleshooting
- Prisma client errors: run `pnpm -C packages/db prisma generate`.
- DB errors: check Docker and `DATABASE_URL`.
- Port in use: stop the process or change ports in `.env`.
