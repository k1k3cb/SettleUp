# SettleUp

SettleUp is a fullstack portfolio project for managing shared expenses in groups.
It tracks who paid, how expenses are split, each member's net balance, and the
minimum practical set of transfers needed to settle the group.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- Data fetching: TanStack Query
- Backend: Express, TypeScript
- Database: PostgreSQL with Drizzle ORM
- Realtime: Socket.io (local) with 15s polling fallback (production)
- Auth: email/password
- Deployment target: Vercel for `apps/web`, Railway for `apps/api`, Neon for Postgres

## Realtime sync

The client keeps the group view in sync without manual refresh:

- **Local** (`VITE_WS_URL` set): the client opens a Socket.IO connection,
  joins the group's room, and reacts to `expense:created`,
  `expense:cancelled`, `settlement:created`, `settlement:cancelled`,
  and `members:changed` events by invalidating the relevant
  TanStack Query keys.
- **Production** (Vercel, no `VITE_WS_URL`): the same invalidation
  runs on a 15s interval. The UX is the same; the server doesn't
  need persistent connections.

Both paths are behind a single hook, `useGroupRealtime(groupId)`, so
the UI is transport-agnostic. See `apps/web/src/hooks/useGroupRealtime.ts`.

## Workspace

```txt
apps/web          React client
apps/api          Express API and Socket.io server
packages/shared   Shared types, schemas, and pure business logic
packages/eslint-config
docs              Architecture, API, and database notes
```

## Next Steps

1. Install dependencies with `pnpm install` after choosing package versions.
2. Create a Neon Postgres database and copy its pooled `DATABASE_URL`.
3. Implement Drizzle schema and migrations in `apps/api/src/db`.
4. Build the main flows: groups, expenses, balances, settlements, and realtime updates.



