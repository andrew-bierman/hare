---
name: setup
description: Sets up local development environment for Hare in git worktrees. Use when starting work in a new worktree, setting up local development, initializing the project, or when the user mentions setup, dev environment, or port conflicts.
---

# Worktree Development Setup

This skill helps set up the local development environment for Hare, especially when working in git worktrees where multiple instances may run simultaneously.

## When to Use

- Starting work in a new git worktree
- First time setting up the project
- After cloning the repository
- When encountering port conflicts
- When environment files are missing

## Quick Setup

Run the automated setup script:

```bash
bun run setup:worktree
```

This handles everything automatically. See [SETUP_SCRIPT.md](SETUP_SCRIPT.md) for options.

## Manual Setup Steps

### 1. Install Dependencies

```bash
bun install
```

This will:
- Install all dependencies
- Run the postinstall script to generate environment files from `.env.local`

### 2. Check/Create Environment File

If `.env.local` doesn't exist at the root, create it:

```bash
cp .env.local.example .env.local
```

Then generate a `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Add this to `.env.local` as `BETTER_AUTH_SECRET=<generated-value>`.

### 3. Configure Unique Port (Critical for Worktrees)

The API and app run on the **same port** via the Cloudflare Vite plugin. Default is port 3000.

When running multiple worktrees, each needs a unique port. Calculate one:

```bash
# Generate a port (3001-3099) from the worktree directory name
PORT=$((3000 + ($(echo "$PWD" | cksum | cut -d' ' -f1) % 99) + 1))
echo "Use port: $PORT"
```

Update `.env.local`:

```bash
BETTER_AUTH_URL=http://localhost:$PORT
NEXT_PUBLIC_APP_URL=http://localhost:$PORT
```

Then regenerate environment files:

```bash
bun run scripts/env.ts
```

### 4. Set Up Local Database

Create and migrate the local D1 database:

```bash
bun run db:migrate:local
```

### 5. Start Development

```bash
PORT=3001 bun run dev
```

Or check your `.worktree-config` for the configured port:

```bash
cat .worktree-config
```

## Troubleshooting

### Port Already in Use

If you get `EADDRINUSE` errors:

1. Check what's using the port:
   ```bash
   lsof -i :3000
   ```

2. Kill the process or use a different port:
   ```bash
   PORT=3050 bun run dev
   ```

### Missing Environment Variables

If you see auth errors or missing bindings:

1. Ensure `.env.local` exists at the root
2. Regenerate environment files:
   ```bash
   bun run scripts/env.ts
   ```
3. Check that `apps/web/.dev.vars` was created

### Database Errors

If you get D1/database errors:

1. Ensure local migrations are applied:
   ```bash
   bun run db:migrate:local
   ```

2. Check wrangler is using local database (not remote)

## Environment Checklist

Before starting development, verify:

- [ ] `bun install` completed successfully
- [ ] `.env.local` exists with `BETTER_AUTH_SECRET` set
- [ ] `apps/web/.env.local` and `apps/web/.dev.vars` exist
- [ ] Port is unique (no conflicts with other worktrees)
- [ ] Both `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` use the same port
- [ ] Local database migrations applied
- [ ] Dev server starts without errors
