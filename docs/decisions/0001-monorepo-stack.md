# 0001: Monorepo with NestJS + Next.js + Prisma

## Status
Accepted

## Context
We need a full-stack app with shared types and packages, consistent tooling, and a clear separation of API, web, and worker responsibilities.

## Decision
Use a Turborepo monorepo with:
- NestJS for API
- Next.js for web
- Prisma + Postgres for data
- pnpm workspaces for dependency management

## Consequences
- Faster cross-package changes and type sharing.
- CI runs multiple packages consistently.
- Requires basic monorepo familiarity.
