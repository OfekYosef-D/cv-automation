# CV Automation MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the MVP for the CV auto-apply platform with ingestion, matching, approval console, and agent artefacts.

**Architecture:** Turborepo monorepo with Next.js UI, NestJS API, BullMQ workers, PostgreSQL+Prisma, Redis. Single-tenant ready via `tenantId` + middleware only. Agent outputs stored as structured artefacts; Copilot SDK deferred to phase 2.

**Tech Stack:** TypeScript, pnpm, Turborepo, NestJS, Next.js, Prisma, PostgreSQL, Redis, BullMQ, Pino.

---

### Task 1: Initialize monorepo scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `README.md`

**Step 1: Write the failing test**

Create a minimal test in `packages/shared/__tests__/health.test.ts` that imports a `healthCheck()` function that does not exist yet and expects it to return `"ok"`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/shared test`
Expected: FAIL with missing module/function error.

**Step 3: Write minimal implementation**

Create `packages/shared/src/health.ts` exporting `healthCheck()` returning `"ok"`. Wire up `packages/shared/package.json`, `tsconfig.json`, and a minimal test runner (vitest or jest) to pass.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/shared test`
Expected: PASS.

**Step 5: Commit**

Commit message: `chore: initialize monorepo scaffold`

---

### Task 2: Set up Next.js web app shell

**Files:**
- Create: `apps/web/*`

**Step 1: Write the failing test**

Add a test in `apps/web/__tests__/app-health.test.tsx` expecting a `Health` component to render `"ok"`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/web test`
Expected: FAIL with missing component.

**Step 3: Write minimal implementation**

Create `apps/web/app/page.tsx` and `apps/web/components/Health.tsx` to render `"ok"`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/web test`
Expected: PASS.

**Step 5: Commit**

Commit message: `chore: add web app shell`

---

### Task 3: Set up NestJS API shell

**Files:**
- Create: `apps/api/*`

**Step 1: Write the failing test**

Add a test in `apps/api/test/health.e2e-spec.ts` expecting `GET /health` to return `"ok"`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test:e2e`
Expected: FAIL with 404.

**Step 3: Write minimal implementation**

Create `HealthController` and route in NestJS to return `"ok"`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test:e2e`
Expected: PASS.

**Step 5: Commit**

Commit message: `chore: add api app shell`

---

### Task 4: Set up worker app with BullMQ

**Files:**
- Create: `apps/worker/*`

**Step 1: Write the failing test**

Add a test in `apps/worker/test/worker-health.test.ts` expecting a `workerHealth()` function to return `"ok"`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/worker test`
Expected: FAIL missing module/function.

**Step 3: Write minimal implementation**

Create minimal worker app and `workerHealth()` implementation.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/worker test`
Expected: PASS.

**Step 5: Commit**

Commit message: `chore: add worker app shell`

---

### Task 5: Add Prisma + core schema (tenant-ready)

**Files:**
- Create: `packages/db/prisma/schema.prisma`
- Modify: `apps/api/*` to connect Prisma

**Step 1: Write the failing test**

Add a test in `apps/api/test/db.e2e-spec.ts` expecting a `Tenant` record can be created and fetched.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test:e2e`
Expected: FAIL due to missing schema/migrations.

**Step 3: Write minimal implementation**

Define schema with `Tenant`, `User`, `Cv`, `CvVersion`, `JobSource`, `Job`, `JobMatch`, `AgentArtefact`, `Approval`, `ConsentLog`. Wire Prisma client in API.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test:e2e`
Expected: PASS.

**Step 5: Commit**

Commit message: `feat: add prisma schema and db wiring`

---

### Task 6: Add tenant middleware + OAuth skeleton

**Files:**
- Modify: `apps/api/src/*`

**Step 1: Write the failing test**

Add a test expecting requests to include `tenantId` in request context and access `GET /me` requires auth.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test:e2e`
Expected: FAIL due to missing middleware/guard.

**Step 3: Write minimal implementation**

Add tenant middleware, `AuthGuard`, and OAuth skeleton (Google/GitHub) with placeholders.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test:e2e`
Expected: PASS.

**Step 5: Commit**

Commit message: `feat: add tenant context and auth skeleton`

---

### Task 7: Agent artefacts service

**Files:**
- Modify: `apps/api/src/artefacts/*`

**Step 1: Write the failing test**

Add a test expecting `POST /artefacts` creates a record with `jobId`, `cvVersionId`, `promptVersion`, `model`, `claimsUsed`, `status`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test:e2e`
Expected: FAIL 404.

**Step 3: Write minimal implementation**

Add controller, service, and DTOs for artefacts.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test:e2e`
Expected: PASS.

**Step 5: Commit**

Commit message: `feat: add agent artefacts API`

---

### Task 8: Ingestion (Greenhouse + RSS) + idempotency

**Files:**
- Modify: `apps/worker/src/*`
- Modify: `apps/api/src/ingestion/*`

**Step 1: Write the failing test**

Add a worker test expecting `ingestGreenhouse()` creates one job and dedupes when re-ingested.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/worker test`
Expected: FAIL missing ingestion.

**Step 3: Write minimal implementation**

Implement Greenhouse + RSS ingest, normalization, dedupe by `(source, externalJobId)` and hash.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/worker test`
Expected: PASS.

**Step 5: Commit**

Commit message: `feat: add ingestion with idempotency`

---

### Task 9: Rule-based matching + explainability

**Files:**
- Create: `packages/matching/*`
- Modify: `apps/api/src/matching/*`

**Step 1: Write the failing test**

Add a test expecting a job to receive a score and explanation based on role, seniority, location, recency, and skills.

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/matching test`
Expected: FAIL missing matcher.

**Step 3: Write minimal implementation**

Implement weighted scoring with explanation strings and config.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/matching test`
Expected: PASS.

**Step 5: Commit**

Commit message: `feat: add rule-based matching`

---

### Task 10: Approval Console UI

**Files:**
- Modify: `apps/web/app/*`
- Modify: `apps/web/components/*`

**Step 1: Write the failing test**

Add a test expecting the list view to render jobs and the detail view to show artefacts.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/web test`
Expected: FAIL missing UI.

**Step 3: Write minimal implementation**

Implement list + detail UI, artefact panel, and approve/reject/snooze actions.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/web test`
Expected: PASS.

**Step 5: Commit**

Commit message: `feat: add approval console UI`

---

### Task 11: Consent & audit logging

**Files:**
- Modify: `apps/api/src/consent/*`

**Step 1: Write the failing test**

Add a test expecting a consent log entry on approve action.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test:e2e`
Expected: FAIL missing audit.

**Step 3: Write minimal implementation**

Create consent log entity and hook into approval flow.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test:e2e`
Expected: PASS.

**Step 5: Commit**

Commit message: `feat: add consent logging`

---

### Task 12: Observability + CI + Docker

**Files:**
- Create: `packages/observability/*`
- Create: `docker-compose.yml`
- Create: `.github/workflows/ci.yml`

**Step 1: Write the failing test**

Add a minimal test expecting logger initialization to return a logger instance.

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/observability test`
Expected: FAIL missing logger.

**Step 3: Write minimal implementation**

Add Pino logger wrapper, docker compose for Postgres/Redis, and CI pipeline.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/observability test`
Expected: PASS.

**Step 5: Commit**

Commit message: `chore: add observability, docker, and CI`

---

Plan complete.

Two execution options:

1. Subagent-Driven (this session) — I dispatch a fresh subagent per task, review between tasks.
2. Parallel Session (separate) — Open new session with executing-plans, batch execution with checkpoints.

Which approach?