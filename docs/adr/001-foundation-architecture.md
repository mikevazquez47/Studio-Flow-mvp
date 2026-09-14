# ADR-001 · Foundation architecture

## Status
Accepted.

## Decision
StudioFlow starts from a clean implementation using a modular monolith.

- Next.js App Router + TypeScript strict.
- React Server Components by default.
- PostgreSQL/Supabase for data, auth and storage.
- Vercel as the target deployment platform.
- Tailwind CSS for the design system layer.
- Business rules live behind application/domain services, not inside UI components.
- No reuse of code, migrations or database state from the previous StudioFlow implementation.

## Tenant model
Operational data is studio-scoped. Tenant isolation is enforced in the database and application authorization layers.

## Data integrity
Business history is preserved through state transitions, snapshots and append-only ledgers/audit records where specified. Direct balance/status mutation endpoints are not allowed for critical domains.

## Security
Every table exposed in `public` must have RLS enabled from creation. Policies are added only when the identity/membership model required to authorize them exists.

## Consequences
The first implementation may appear slower than copying existing code, but removes inherited coupling and lets the physical schema match the approved product model from the first migration.
