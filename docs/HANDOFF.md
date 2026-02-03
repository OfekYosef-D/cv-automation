# Agent Handoff Package

**Use this to start a new Cursor/Claude session** so the agent has full context.

---

## Copy-paste this to a new agent

```text
I'm continuing work on the CV Automation project. Use these files as the handoff package:

**Read first:**
1. AGENTS.md (root) – project overview, stack, conventions, commands
2. docs/plans/2026-01-31-approval-console-data-wiring-tailwind-shadcn-plan.md – implementation plan
3. docs/onboarding.md – setup and run instructions
4. docs/architecture.md – data flow and components

**Context:**
- Monorepo: NestJS API, Next.js web, worker, shared packages
- Tech: TypeScript, Turborepo, pnpm, Prisma, Postgres
- Plan has 6 tasks; each maps to a GitHub issue

**Current work:**
- GitHub issues #1–#6 are open (API jobs list, job detail, reject/snooze, web wiring, Tailwind+shadcn, optimistic tests)
- Implement in order: #1 → #2 → #3 → #4 → #5 → #6
- Use TDD: write failing test first, then implement
- Plan explicitly references `executing-plans` skill

**Run the app:** `pnpm dev` (API:3001, Web:3000). Ensure .env exists and Postgres is up (`pnpm docker:up`).
```

---

## What agents can access

| Resource | How |
|----------|-----|
| **Codebase** | Full repo is in workspace |
| **GitHub issues** | Via `gh issue list` / `gh issue view` if gh CLI is installed |
| **Plan** | `docs/plans/2026-01-31-approval-console-data-wiring-tailwind-shadcn-plan.md` |
| **AGENTS.md** | Project conventions, commands, doc pointers |
| **Cursor rules** | `.cursor/rules/` – TypeScript, React, NestJS |
| **Skills** | Installed globally (~/.agents/skills) – React, Next.js, NestJS, executing-plans, etc. |

---

## Issue → Plan mapping

| Issue | Title | Plan task |
|-------|-------|-----------|
| #1 | API: jobs list endpoint with paging/filtering | Task 1 |
| #2 | API: job detail endpoint | Task 2 |
| #3 | API: add reject and snooze approvals | Task 3 |
| #4 | Web: wire approval console data | Task 4 |
| #5 | Web: Tailwind + shadcn setup | Task 5 |
| #6 | Web: optimistic UX tests | Task 6 |

---

## Tips for agents

1. **Check GitHub**: Run `gh issue list` to see open issues and `gh issue view <n>` for details.
2. **Follow the plan**: Each task has step-by-step instructions (failing test → implement → verify).
3. **Branch per issue**: `git checkout -b feat/issue-1-jobs-list` (or similar).
4. **Commit per task**: Use conventional commits, e.g. `feat(api): add jobs list endpoint`.
5. **Run tests**: `pnpm test` and `pnpm -C apps/api test:e2e` before committing.
