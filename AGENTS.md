# Agent Guide

Guidance for AI agents (Cursor, Claude, etc.) working on this codebase.

## Project

**CV Automation** – MVP for CV-driven job discovery, matching, and approval workflows.

## Stack

- **API**: NestJS, Prisma, Postgres
- **Web**: Next.js 14 (App Router), React 18
- **Worker**: Background ingestion (Greenhouse, RSS)
- **Monorepo**: Turborepo, pnpm workspaces

## Key Docs

| Doc | Path |
|-----|------|
| **Handoff** (new session) | `docs/HANDOFF.md` |
| Onboarding | `docs/onboarding.md` |
| Architecture | `docs/architecture.md` |
| Runbook | `docs/runbook.md` |
| Current plan | `docs/plans/2026-01-31-approval-console-data-wiring-tailwind-shadcn-plan.md` |
| Decisions | `docs/decisions/` |

## Conventions

1. **Testing**: TDD – write failing test first, then implement. Web: Vitest. API: Jest e2e.
2. **Tenant context**: `x-tenant-id` header, resolved via middleware. See `docs/decisions/0002-tenant-middleware.md`.
3. **Commits**: Conventional commits preferred (`feat:`, `fix:`, `test:`).
4. **Plan execution**: Use `executing-plans` skill for multi-task plans.

## Commands

```bash
pnpm dev           # Run API + web + worker
pnpm dev:api       # API only
pnpm dev:web       # Web only
pnpm test          # All tests
pnpm db:migrate    # Run migrations
pnpm db:generate   # Regenerate Prisma client
```

## Ports

- Web: 3000
- API: 3001
- Postgres: 5432
