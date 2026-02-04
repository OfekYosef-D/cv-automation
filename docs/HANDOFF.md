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
- Web stack: Next.js 16.1.6, React 19, ESLint 9 (flat config), Tailwind CSS 4, Vitest 4
- CI: GitHub Actions with PostgreSQL service container

**Current status:**
- Phase 1 COMPLETE: Issues #1-#6 (Approval Console data wiring) merged
- Issue #9 COMPLETE: Job list with filtering and pagination UI
- Skills audit COMPLETE: PR #15 - codebase now follows best practices
- Issue #8 COMPLETE: Matching API with UserProfile storage (PR #16 merged)
- Phase 2 IN PROGRESS: Issues #10-#13 are open
- All tests passing: pnpm test (29 web + 4 packages), pnpm typecheck, pnpm lint

**Next steps:**
1. Pick next issue: #10 (Match score UI) or #11 (BullMQ worker)
2. Use TDD and announce which skills you're using
3. Use `finishing-a-development-branch` skill before completing work

**Run the app:** `pnpm dev` (API:3001, Web:3000). Ensure .env exists and Postgres is up (`pnpm docker:up`).
```

---

## Project Status Summary

### Completed

| Issue | Title | Status |
|-------|-------|--------|
| #1 | API: jobs list endpoint with paging/filtering | CLOSED |
| #2 | API: job detail endpoint | CLOSED |
| #3 | API: add reject and snooze approvals | CLOSED |
| #4 | Web: wire approval console data | CLOSED |
| #5 | Web: Tailwind + shadcn setup | CLOSED |
| #6 | Web: optimistic UX tests | CLOSED |
| #9 | Web: Add job list with filtering and pagination UI | CLOSED |
| #8 | API: Add matching endpoint to score jobs against CV | CLOSED |

### Open (Phase 2)

| Issue | Title | Priority |
|-------|-------|----------|
| #10 | Web: Add match score display in job detail | High |
| #11 | Worker: Add BullMQ job queue for ingestion | High |
| #12 | API: Complete OAuth2 authentication (Google/GitHub) | Medium |
| #13 | Infra: Add production deployment configuration | Low |

### Recommended Order
1. **#10** (Match score UI) - Uses new matching API from #8
2. **#11** (BullMQ) - Enables automatic job ingestion
3. **#12** (OAuth) - Security requirement
4. **#13** (Deployment) - Go live

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
- `GET /profile` - Get tenant's matching profile
- `PUT /profile` - Create/update matching profile (desiredRoles, seniority, location, mustHaveSkills)
- `POST /matching/score` - Score a job against provided profile (stateless)
- `GET /matching/jobs/:jobId` - Score a job against stored profile (requires profile)

### Web (apps/web)
- **Next.js 16.1.6** with React 19, ESLint 9 flat config, Tailwind CSS 4
- Approval Console with job list and detail panels
- **Pagination** with URL state (page param, shareable links, browser back/forward)
- **Status filter** dropdown (All, Pending, Approved, Rejected, Snoozed)
- Approve/Reject/Snooze actions with optimistic updates
- **Race condition guard** using request ID to prevent stale API responses
- Tailwind CSS + shadcn/ui components (Button, Card, Badge, Select)
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
| API DTOs | `apps/api/src/**/*.dto.ts` |
| Database schema | `packages/db/prisma/schema.prisma` |
| Web pages | `apps/web/app/**/*.tsx` |
| Web components | `apps/web/components/**/*.tsx` |
| Shared types | `apps/web/lib/types.ts` |
| Approval Console | `apps/web/components/approval-console.tsx` |
| Error Boundary | `apps/web/app/error.tsx` |
| API client | `apps/web/lib/api.ts` |
| Class merge utility | `apps/web/lib/utils.ts` |
| Next.js config | `apps/web/next.config.ts` |
| ESLint config | `apps/web/eslint.config.mjs` |
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

## Recent Upgrades (Feb 2026)

The web app was upgraded to latest stable versions:

| Package | Version |
|---------|---------|
| Next.js | 16.1.6 |
| React | 19.2.4 |
| ESLint | 9.39.2 (flat config) |
| Vitest | 4.0.18 |
| Tailwind CSS | 4.1.18 |
| TypeScript | 5.9.3 |

**Key changes:**
- `next.config.ts` (TypeScript, not .js)
- `eslint.config.mjs` (ESLint 9 flat config, not .eslintrc.cjs)
- React 19: No more `JSX.Element` type annotations (inferred automatically)
- `lint-staged` runs eslint via `pnpm --filter @cv/web exec eslint --fix`

---

## Skills Audit Complete (Feb 2026)

✅ **PR #15 completed the skills audit.** The codebase now follows best practices from `.cursor/skills/`.

**What was fixed:**
- Added comprehensive test coverage (29 web tests covering actions, errors, loading states)
- Created validated DTOs with class-validator for API endpoints
- Extracted shared types to `lib/types.ts` (no more duplication)
- Standardized imports: `cn()` from `@/lib/utils` used consistently
- Added `error.tsx` error boundary for App Router
- Removed redundant code (unused JobsModule, duplicate tenant checks)
- Updated Turborepo config (outputs, scripts)

**Skills cleanup:** Removed 69 irrelevant skills (Java/Spring, Vue, AWS CloudFormation). Now ~57 curated skills remain.

**Key patterns established:**
- Shared types in `apps/web/lib/types.ts`
- API DTOs in `apps/api/src/*/*.dto.ts` with class-validator
- UI components use `cn()` from `@/lib/utils`
- Controllers trust TenantMiddleware (no redundant checks)

---

## Deployment Recommendation

For Issue #13 (production deployment), the recommended stack is:

| Component | Platform | Why |
|-----------|----------|-----|
| **Web (Next.js)** | Vercel | Built for Next.js, free tier, automatic deployments |
| **API (NestJS)** | Railway or Render | Simple container deployment, ~$5/mo |
| **Database** | Supabase or Railway | Free PostgreSQL tier, managed backups |
| **Worker** | Railway or Render | Same platform as API |

Skills available: `vercel-react-best-practices`, `supabase-postgres-best-practices`

---

## Tips for Next Agent

1. **USE SKILLS:** Check `.cursor/skills/` before any task - announce which skills you're using
2. **Check CI first:** Run `gh run list` to see recent CI runs
3. **Follow TDD:** Write failing test, implement, verify
4. **Use turbo:** `pnpm --filter @cv/api test:e2e` to run specific package tests
5. **Branch per issue:** `feat/issue-N-description`
6. **Conventional commits:** `feat(api):`, `fix(web):`, `test:`, `chore:`
7. **React 19:** Don't use `JSX.Element` return types - let TypeScript infer them
8. **Shared types:** Import from `@/lib/types` not inline interfaces
9. **API DTOs:** Use class-validator decorators, definite assignment (`!:`)
10. **Race conditions:** Use request ID pattern (see `approval-console.tsx`)
11. **URL state:** Use `useSearchParams` + `useRouter` for pagination/filtering
12. **Completion:** Use `finishing-a-development-branch` skill before completing work
