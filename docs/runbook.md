# Runbook

## Local setup
1. Install Node.js 20+ and pnpm 9.
2. Create `.env` in repo root with `DATABASE_URL`.
3. Start Postgres: `docker compose up -d`.
4. Install deps: `pnpm install`.

## Start services
- API: `pnpm -C apps/api start:dev`
- Web: `pnpm -C apps/web dev`
- Worker: `pnpm -C apps/worker dev`

## Tests
- All: `pnpm test`
- API e2e: `pnpm -C apps/api test:e2e`
- Web: `pnpm -C apps/web test`

## Troubleshooting
- **Prisma client missing**: run `pnpm -C packages/db prisma generate`.
- **DB errors**: confirm Docker is running and `DATABASE_URL` is set.
- **Port in use**: stop the process or change ports in `.env`.
