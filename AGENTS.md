# Agent Guide

Guidance for AI agents (Cursor, Claude, etc.) working on this codebase.

## IMPORTANT: Use Skills First!

**Skills folder: `.cursor/skills/`** - Contains 100+ skills for best practices.

⚠️ **WARNING:** The previous session (Feb 2026) did NOT use these skills. The codebase may not follow all best practices. **Your first task should be to review and fix the current state using the relevant skills.**

**Before starting ANY work:**
1. Run `Get-ChildItem -Path ".cursor/skills" -Force` to see available skills
2. Read relevant skill SKILL.md files for your task
3. Announce which skills you're using: "I'm using the X skill"

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

**Recommended first session task:** Review codebase against these skills and fix any violations to ensure the base is modular, readable, and maintainable.

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
