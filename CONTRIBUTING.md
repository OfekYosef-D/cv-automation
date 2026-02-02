# Contributing

Thanks for your interest in contributing!

## Development setup
1. Install Node.js 20+ and pnpm 9.
2. Copy `.env.example` to `.env` if present and set `DATABASE_URL`.
3. Start Postgres with `docker compose up -d`.
4. Install deps: `pnpm install`.

## Common scripts
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## Branching
- Create a branch per change: `feat/<topic>` or `fix/<topic>`.
- Keep commits small and focused.

## Pull requests
- Fill the PR template.
- Include tests.
- Ensure CI passes.

## Code style
- Prefer explicit names over cleverness.
- Keep functions short and readable.
- Add tests for behavior changes.
