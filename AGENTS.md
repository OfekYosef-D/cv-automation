# Agent Guide

Guidance for AI agents (Cursor, Claude, etc.) working on this codebase.

## Use Skills!

**Skills folder: `.cursor/skills/`** - Contains ~57 curated skills relevant to this project.

✅ **Skills audit complete (PR #15).** The codebase follows best practices.
✅ **Skills cleanup complete.** Removed 69 irrelevant skills (Java/Spring, Vue, AWS CloudFormation).

**Before starting work:**
1. Read relevant skill SKILL.md files for your task
2. Announce which skills you're using: "I'm using the X skill"

**Key skills for this project:**
- `executing-plans` - For implementing multi-task plans
- `finishing-a-development-branch` - Before completing work
- `verification-before-completion` - Before marking tasks done
- `next-best-practices` - Next.js patterns
- `react-patterns` - React patterns
- `nestjs-best-practices` - NestJS API patterns
- `shadcn-ui` - UI components
- `vitest` - Testing
- `test-driven-development` - TDD approach
- `turborepo` - Monorepo patterns
- `tailwind-css-patterns` - Styling

---

## Project

**CV Automation** – MVP for CV-driven job discovery, matching, and approval workflows.

## Stack

- **API**: NestJS, Prisma, Postgres
- **Web**: Next.js 16.1.6 (App Router), React 19
- **Worker**: Background ingestion (Greenhouse, RSS)
- **Monorepo**: Turborepo, pnpm workspaces

## Key Docs

| Doc | Path |
|-----|------|
| **Handoff** (new session) | `docs/HANDOFF.md` |
| **Skills** (USE THESE!) | `.cursor/skills/` |
| Onboarding | `docs/onboarding.md` |
| Architecture | `docs/architecture.md` |
| Runbook | `docs/runbook.md` |
| Decisions | `docs/decisions/` |

## Conventions

1. **Skills first**: Check `.cursor/skills/` for relevant skills before any task.
2. **Testing**: TDD – write failing test first, then implement. Web: Vitest. API: Jest e2e.
3. **Tenant context**: `x-tenant-id` header, resolved via middleware. See `docs/decisions/0002-tenant-middleware.md`.
4. **Commits**: Conventional commits preferred (`feat:`, `fix:`, `test:`).
5. **Plan execution**: Use `executing-plans` skill for multi-task plans.
6. **Completion**: Use `finishing-a-development-branch` skill before completing work.

## Established Patterns

**Web (apps/web):**
- Shared types: `lib/types.ts` - import from `@/lib/types`
- Class merging: use `cn()` from `@/lib/utils` (not raw clsx)
- Error boundary: `app/error.tsx` handles uncaught errors
- API client: `lib/api.ts` with typed responses
- Race conditions: use request ID ref pattern (see `approval-console.tsx`)

**API (apps/api):**
- DTOs: use class-validator decorators with `!:` for properties
- Controllers: trust TenantMiddleware, use `request.tenantId!`
- Services: business logic only, inject dependencies via constructor

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
