# CV Automation

MVP monorepo for CV-driven job discovery, matching, and approval workflows.

## Tech stack
- TypeScript
- Turborepo + pnpm
- NestJS (API)
- Next.js (Web)
- Prisma + Postgres
- Redis + BullMQ (planned)

## Quick start
1. Install Node.js 20+ and pnpm 9.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Start Postgres: `docker compose up -d`.
4. Install dependencies: `pnpm install`.

### Run apps
- API: `pnpm -C apps/api start:dev`
- Web: `pnpm -C apps/web dev`
- Worker: `pnpm -C apps/worker dev`

### Tests
- All: `pnpm test`
- API e2e: `pnpm -C apps/api test:e2e`
- Web: `pnpm -C apps/web test`

## Repository structure
- apps/api
- apps/web
- apps/worker
- packages/db
- packages/matching
- packages/observability
- packages/shared

## Documentation
- Architecture: docs/architecture.md
- Runbook: docs/runbook.md
- Decisions: docs/decisions/

## Workflow
- Create an issue
- Create a branch per change
- Open a PR using the template
- Ensure CI passes
