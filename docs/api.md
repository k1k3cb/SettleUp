# API

The API will expose authenticated REST endpoints and Socket.io events.

## Initial REST Areas

- `auth`: register, login, logout, current session.
- `groups`: create groups, list memberships, join by invite.
- `expenses`: create expenses, list history, cancel expenses.
- `balances`: get current group balances and suggested transfers.
- `settlements`: create settlement records and confirm payments.

## Realtime Events

- `group:updated`
- `expense:created`
- `expense:cancelled`
- `settlement:created`
- `settlement:confirmed`
