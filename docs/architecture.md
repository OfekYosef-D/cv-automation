# Architecture

## Overview
This is a monorepo with three apps and shared packages:
- **apps/api**: NestJS API
- **apps/web**: Next.js web app
- **apps/worker**: Background ingestion worker
- **packages/**: shared libraries (db, matching, observability)

## Data flow
1. Worker ingests jobs into Postgres.
2. API reads/writes jobs, artefacts, approvals.
3. Web app fetches data from the API and renders the Approval Console.

## Key components
- **Prisma**: typed DB access layer
- **Tenant middleware**: resolves tenant context from headers
- **Artefacts**: AI-generated CV summaries tied to jobs
- **Approvals**: user decisions (approve/reject/snooze)

## Testing
- Web: Vitest
- API: Jest e2e tests
- Worker: Vitest

## Environments
- Local: Docker Compose + .env
- CI: GitHub Actions
