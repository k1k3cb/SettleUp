# SettleUp

SettleUp is a fullstack portfolio project for managing shared expenses in groups.
It tracks who paid, how expenses are split, each member's net balance, and the
minimum practical set of transfers needed to settle the group.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- Data fetching: TanStack Query
- Backend: Express, TypeScript
- Database: PostgreSQL with Drizzle ORM
- Realtime: Socket.io
- Auth: email/password
- Deployment target: Vercel for `apps/web`, Railway for `apps/api`, Neon for Postgres

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
