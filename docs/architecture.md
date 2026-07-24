# Architecture

SettleUp is organized as a small monorepo with a React frontend, an Express API,
and a shared package for cross-app types and pure business logic.

## Runtime Flow

1. Users interact with the React app in `apps/web`.
2. The client calls REST endpoints exposed by `apps/api`.
3. The API persists source data in PostgreSQL through Drizzle.
4. Balances are derived from expenses and confirmed settlements.
5. Socket.io broadcasts group changes to connected members.

## Design Decisions

- Money is stored as integer cents.
- Balances are derived from source records, not stored as mutable totals.
- Expense cancellation should preserve audit history.
- Settlement suggestions are produced by a greedy min-cash-flow algorithm.
