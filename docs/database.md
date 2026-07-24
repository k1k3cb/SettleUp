# Database

The recommended hosted PostgreSQL provider for this project is Neon.

## Why Neon

- Good free tier for portfolio projects.
- Serverless compute that can scale to zero while idle.
- Pooled connection strings for serverless and hosted backends.
- Branching for development and preview environments.

## Core Tables To Model

- `users`
- `groups`
- `group_members`
- `expenses`
- `expense_splits`
- `settlements`
- `invitations`

Balances should be calculated from `expenses`, `expense_splits`, and confirmed
`settlements`.
