# 0002: Tenant context via middleware

## Status
Accepted

## Context
We need multi-tenant readiness but only a single-tenant MVP today.

## Decision
Resolve `tenantId` from request headers via middleware and store it on the request object.

## Consequences
- Easy to evolve into full auth later.
- Requires headers for local/dev usage.
