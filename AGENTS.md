# SettleUp Agent Instructions

## Package Manager

- Always use `pnpm` in this repository.
- Do not use `npm`, `yarn`, or `bun` to install dependencies, run scripts, or execute package CLIs.
- Use workspace filters for app-specific installs:
  - Web: `pnpm --filter @settleup/web add <package>`
  - API: `pnpm --filter @settleup/api add <package>`
  - Root dev tools: `pnpm add -Dw <package>`
- Use `pnpm dlx` for one-off CLIs such as shadcn.
- Keep `pnpm-lock.yaml` as the only lockfile.
