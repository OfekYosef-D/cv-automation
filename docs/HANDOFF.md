# Agent Handoff Package

**Use this to start a new Cursor/Claude session** so the agent has full context.

---

## Copy-paste this to a new agent

```text
I'm continuing work on the CV Automation project. Use these files as the handoff package:

**Read first:**
1. AGENTS.md (root) – project overview, stack, conventions, commands
2. docs/HANDOFF.md – this file, current status and next steps
3. docs/plans/2026-01-31-cv-automation-mvp-plan.md – full MVP implementation plan
4. docs/architecture.md – data flow and components

**Context:**
- Monorepo: NestJS API, Next.js web, worker, shared packages
- Tech: TypeScript, Turborepo, pnpm, Prisma, Postgres
- CI: GitHub Actions with PostgreSQL service container

**Current status:**
- Phase 1 COMPLETE: Issues #1-#6 (Approval Console data wiring) are closed and merged (PR #7)
- Phase 2 IN PROGRESS: Issues #8-#13 are open for next development cycle
- All tests passing: pnpm test, pnpm typecheck, pnpm lint

**Next steps:**
- Pick an issue from #8-#13 to implement
- Use TDD: write failing test first, then implement
- Create feature branch, implement, PR, merge

**Run the app:** `pnpm dev` (API:3001, Web:3000). Ensure .env exists and Postgres is up (`pnpm docker:up`).
```

---

## Project Status Summary

### Completed (Phase 1)
| Issue | Title | Status |
|-------|-------|--------|
| #1 | API: jobs list endpoint with paging/filtering | CLOSED |
| #2 | API: job detail endpoint | CLOSED |
| #3 | API: add reject and snooze approvals | CLOSED |
| #4 | Web: wire approval console data | CLOSED |
| #5 | Web: Tailwind + shadcn setup | CLOSED |
| #6 | Web: optimistic UX tests | CLOSED |

### Open (Phase 2)
| Issue | Title | Priority |
|-------|-------|----------|
| #8 | API: Add matching endpoint to score jobs against CV | High |
| #9 | Web: Add job list with filtering and pagination UI | High |
| #10 | Web: Add match score display in job detail | Medium |
| #11 | Worker: Add BullMQ job queue for ingestion | Medium |
| #12 | API: Complete OAuth2 authentication (Google/GitHub) | Medium |
| #13 | Infra: Add production deployment configuration | Low |

### Recommended Order
1. **#9** (Job list UI) - Most visible improvement
2. **#8** (Matching API) - Enables #10
3. **#10** (Match score UI) - Better user experience
4. **#11** (BullMQ) - Production-ready worker
5. **#12** (OAuth) - Security requirement
6. **#13** (Deployment) - Go live

---

## What's Implemented

### API (apps/api)
- `GET /jobs` - List jobs with pagination, sorting, filtering by approval status
- `GET /jobs/:id` - Job detail with artefacts
- `POST /approvals/approve` - Approve a job
- `POST /approvals/reject` - Reject a job
- `POST /approvals/snooze` - Snooze a job
- `POST /artefacts` - Create agent artefact
- `GET /health` - Health check
- `GET /me` - Current user (requires auth)
- `GET /matching/:jobId` - Match score (basic implementation)

### Web (apps/web)
- Approval Console with job list and detail panels
- Approve/Reject/Snooze actions with optimistic updates
- Tailwind CSS + shadcn/ui components (Button, Card, Badge)
- Typed API client in `lib/api.ts`

### Worker (apps/worker)
- Greenhouse ingestion with idempotency
- RSS ingestion (placeholder)
- Health check

### Shared Packages
- `@cv/db` - Prisma client and schema
- `@cv/matching` - Rule-based matching logic
- `@cv/observability` - Pino logger
- `@cv/shared` - Health utilities

---

## CI Configuration

GitHub Actions (`.github/workflows/ci.yml`) runs:
1. PostgreSQL 16 service container
2. `pnpm install`
3. `pnpm db:generate` (prisma generate)
4. `prisma migrate deploy`
5. `pnpm lint`
6. `pnpm typecheck`
7. `pnpm test`

**Important:** `turbo.json` has `globalEnv: ["DATABASE_URL"]` to pass env vars to test tasks.

---

## Key Files for Development

| Purpose | File |
|---------|------|
| API routes | `apps/api/src/**/*.controller.ts` |
| API business logic | `apps/api/src/**/*.service.ts` |
| Database schema | `packages/db/prisma/schema.prisma` |
| Web pages | `apps/web/app/**/*.tsx` |
| Web components | `apps/web/components/**/*.tsx` |
| API client | `apps/web/lib/api.ts` |
| Turbo config | `turbo.json` |
| CI workflow | `.github/workflows/ci.yml` |

---

## Commands Quick Reference

```bash
# Development
pnpm dev              # Run all apps
pnpm dev:api          # API only (port 3001)
pnpm dev:web          # Web only (port 3000)

# Database
pnpm docker:up        # Start Postgres
pnpm db:generate      # Regenerate Prisma client
pnpm db:migrate       # Run migrations

# Testing
pnpm test             # All tests
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint

# Git workflow
gh issue list         # See open issues
gh issue view 8       # View issue details
git checkout -b feat/issue-8-matching-api
```

---

## Tips for Next Agent

1. **Check CI first:** Run `gh run list` to see recent CI runs
2. **Follow TDD:** Write failing test, implement, verify
3. **Use turbo:** `pnpm --filter @cv/api test:e2e` to run specific package tests
4. **Branch per issue:** `feat/issue-N-description`
5. **Conventional commits:** `feat(api):`, `fix(web):`, `test:`, `chore:`
6. **Skills available:** React patterns, NestJS, Tailwind, shadcn, Vitest, executing-plans
