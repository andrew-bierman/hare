# Setup Script Reference

The `setup-worktree` script (`scripts/setup-worktree.ts`) automates local development setup for git worktrees.

## Usage

```bash
bun run setup:worktree [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--port N` | Use a specific port (default: auto-generated 3001-3099 for worktrees) |
| `--skip-deps` | Skip `bun install` dependency installation |
| `--skip-db` | Skip local database migration |
| `--help` | Show help message |

## What It Does

1. **Detects worktree status** - Checks if running in a git worktree
2. **Calculates port** - Generates a unique port for this worktree (3001-3099)
3. **Installs dependencies** - Runs `bun install`
4. **Creates/updates `.env.local`** - Copies from template if missing, generates `BETTER_AUTH_SECRET`
5. **Updates port configuration** - Sets both `BETTER_AUTH_URL` and `VITE_APP_URL` to the same port
6. **Regenerates environment files** - Runs `scripts/env.ts` to create `apps/web/.env.local` and `apps/web/.dev.vars`
7. **Runs database migrations** - Applies local D1 migrations
8. **Creates `.worktree-config`** - Saves port configuration for reference

## Port Calculation

The API and app run on the **same port** via the Cloudflare Vite plugin.

- Main worktree: uses default port 3000
- Git worktrees: use ports 3001-3099 (auto-generated from directory path)

When `--port` is not specified, the script generates a deterministic port from the directory path:

```typescript
const hash = createHash('md5').update(rootDir).digest('hex')
const offset = (parseInt(hash.slice(0, 8), 16) % 99) + 1
const port = 3000 + offset
```

This ensures:
- Same directory always gets the same port
- Different directories get different ports
- Port is between 3001 and 3099

## Output Files

### `.worktree-config`

A reference file saved to the project root:

```
PORT=3042

# Start command:
# PORT=3042 bun run dev
```

This file is gitignored and can be used to remember the configured port.

## Examples

### Standard Setup

```bash
# Full setup with auto-detected port
bun run setup:worktree
```

### Specific Port

```bash
# Use port 3050
bun run setup:worktree --port 3050
```

### Skip Steps

```bash
# Skip dependency installation (already installed)
bun run setup:worktree --skip-deps

# Skip database migration
bun run setup:worktree --skip-db

# Skip both
bun run setup:worktree --skip-deps --skip-db
```

## Manual Equivalent

If you prefer to run steps manually:

```bash
# 1. Install dependencies
bun install

# 2. Create .env.local if needed
cp .env.local.example .env.local

# 3. Generate secret
openssl rand -base64 32
# Add to .env.local as BETTER_AUTH_SECRET=<secret>

# 4. Update port in .env.local (use same port for both!)
# BETTER_AUTH_URL=http://localhost:3050
# VITE_APP_URL=http://localhost:3050

# 5. Regenerate env files
bun run scripts/env.ts

# 6. Run database migrations
bun run db:migrate:local

# 7. Start dev server with custom port
PORT=3050 bun run dev
```
