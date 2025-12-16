# Hare

> Build and deploy AI agents to Cloudflare's edge in minutes

Hare is a SaaS platform for creating, deploying, and managing AI agents on Cloudflare's global edge network. Built on [Mastra](https://mastra.ai) and Cloudflare Workers.

## Features

- **Visual Agent Builder** - Configure agents via UI, no code required
- **One-Click Deploy** - Agents run on 300+ edge locations worldwide
- **Sub-50ms Latency** - Cloudflare Workers cold starts are instant
- **Built-in Memory** - Conversation history, semantic recall, working memory
- **Tool Library** - HTTP, SQL, KV, R2, Vectorize tools out of the box
- **Version Control** - Track changes, rollback to previous versions
- **API Access** - REST API with streaming support
- **Team Collaboration** - Invite teammates, role-based access

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Mastra](https://mastra.ai) |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 + Drizzle ORM |
| Cache | Cloudflare KV |
| Storage | Cloudflare R2 |
| Vectors | Cloudflare Vectorize |
| Auth | Better Auth |
| Payments | Stripe |
| Frontend | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| API | Hono (in Next.js routes) + RPC |
| Monorepo | Bun Workspaces |

---

## Project Structure

```
hare/
├── apps/
│   └── web/                    # Next.js 15 app (Cloudflare Pages)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/           # Auth pages
│       │   │   ├── (dashboard)/      # Dashboard pages
│       │   │   ├── (marketing)/      # Landing, pricing
│       │   │   └── api/
│       │   │       └── [[...route]]/ # Hono API (catch-all)
│       │   ├── components/           # React components (shadcn/ui)
│       │   ├── lib/
│       │   │   ├── api/              # Hono app + routes
│       │   │   ├── auth/             # Better Auth config
│       │   │   ├── db/               # Drizzle client
│       │   │   └── client.ts         # Hono RPC client
│       │   └── hooks/                # React hooks
│       └── ...
├── packages/
│   └── db/                     # Drizzle schema & migrations
│       ├── src/
│       │   ├── schema/         # Table definitions
│       │   └── index.ts        # Exports
│       ├── migrations/         # SQL migrations
│       └── drizzle.config.ts
├── package.json                # Root workspace config
├── bun.lock
└── README.md                   # This file (source of truth)
```

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) >= 3.0
- Cloudflare account

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/hare.git
cd hare

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
```

### Database Setup

```bash
# Create D1 database
wrangler d1 create hare-db
# Add database_id to apps/web/wrangler.jsonc

# Generate migrations
bun run db:generate

# Apply migrations locally
bun run db:migrate:local
```

### Development

```bash
# Start development server
bun run dev
```

Visit http://localhost:3000

---

## Architecture

### Simplified Stack

The entire app runs as a single Next.js application deployed to Cloudflare Pages:

```
┌─────────────────────────────────────────────────────────────────┐
│                      apps/web (Next.js 15)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React Frontend                        │   │
│  │  • Dashboard pages (RSC + Client Components)             │   │
│  │  • shadcn/ui components                                  │   │
│  │  • Hono RPC client for type-safe API calls               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              /api/[[...route]] (Hono)                    │   │
│  │  • REST endpoints with OpenAPI/Scalar docs               │   │
│  │  • Better Auth handlers                                  │   │
│  │  • Zod validation                                        │   │
│  │  • Type-safe RPC exports                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Cloudflare Services                    │   │
│  │  • D1 (SQLite) via Drizzle ORM                          │   │
│  │  • KV for sessions/cache                                 │   │
│  │  • R2 for file storage                                   │   │
│  │  • Vectorize for embeddings                              │   │
│  │  • Workers AI for inference                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Hono in Next.js

The API is built with Hono and mounted in a Next.js catch-all route:

```typescript
// apps/web/src/app/api/[[...route]]/route.ts
import { handle } from 'hono/vercel'
import { app } from '@/lib/api'

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
```

### Hono RPC Client

Type-safe API calls from React components:

```typescript
// apps/web/src/lib/client.ts
import { hc } from 'hono/client'
import type { AppType } from '@/lib/api'

export const client = hc<AppType>('/api')

// Usage in components
const agents = await client.agents.$get()
const agent = await client.agents[':id'].$get({ param: { id: 'xxx' } })
```

---

## API Routes

All routes are defined in `apps/web/src/lib/api/` and mounted at `/api`.

### Auth Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/sign-up` | Create account |
| `POST` | `/api/auth/sign-in/email` | Sign in with email |
| `POST` | `/api/auth/sign-out` | Sign out |
| `GET` | `/api/auth/session` | Get current session |
| `GET` | `/api/auth/callback/:provider` | OAuth callback |

### Workspace Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/workspaces` | List user workspaces |
| `POST` | `/api/workspaces` | Create workspace |
| `GET` | `/api/workspaces/:id` | Get workspace |
| `PATCH` | `/api/workspaces/:id` | Update workspace |
| `DELETE` | `/api/workspaces/:id` | Delete workspace |

### Agent Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/agents` | List agents (requires workspace header) |
| `POST` | `/api/agents` | Create agent |
| `GET` | `/api/agents/:id` | Get agent |
| `PATCH` | `/api/agents/:id` | Update agent |
| `DELETE` | `/api/agents/:id` | Delete agent |
| `POST` | `/api/agents/:id/deploy` | Deploy agent to edge |

### Chat Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/agents/:id/chat` | Chat with agent (SSE stream) |
| `GET` | `/api/agents/:id/conversations` | List conversations |
| `GET` | `/api/conversations/:id/messages` | Get messages |

### Tool Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tools` | List available tools |
| `POST` | `/api/tools` | Create custom tool |
| `GET` | `/api/tools/:id` | Get tool |
| `PATCH` | `/api/tools/:id` | Update tool |
| `DELETE` | `/api/tools/:id` | Delete tool |

### Docs

| Path | Description |
|------|-------------|
| `/api/docs` | Scalar API documentation |
| `/api/openapi.json` | OpenAPI specification |

---

## Database Schema

### Tables

```sql
-- Better Auth tables
users, sessions, accounts, verifications

-- App tables
workspaces           -- Organizations/projects
workspace_members    -- User membership with roles
agents              -- AI agent configurations
tools               -- Custom tool definitions
agent_tools         -- Many-to-many agent<->tool
conversations       -- Chat sessions
messages            -- Chat messages
deployments         -- Agent deployment history
usage               -- Token/request metrics
api_keys            -- Public API access keys
```

### Key Relationships

```
users ──┬── workspace_members ──── workspaces
        │                              │
        │                    ┌─────────┴─────────┐
        │                    │                   │
        │                 agents              tools
        │                    │                   │
        │                    └───── agent_tools ─┘
        │                    │
        │           ┌────────┼────────┐
        │           │        │        │
        │     deployments  convos   usage
        │                    │
        │                messages
        │
        └── api_keys
```

---

## Pages

### Marketing

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/pricing` | Pricing tiers |
| `/docs` | Documentation |

### Auth

| Path | Description |
|------|-------------|
| `/sign-in` | Sign in form |
| `/sign-up` | Sign up form |

### Dashboard

| Path | Description |
|------|-------------|
| `/dashboard` | Overview / home |
| `/dashboard/agents` | Agent list |
| `/dashboard/agents/new` | Create new agent |
| `/dashboard/agents/[id]` | Agent builder |
| `/dashboard/agents/[id]/playground` | Test agent |
| `/dashboard/agents/[id]/settings` | Agent settings |
| `/dashboard/tools` | Tool library |
| `/dashboard/settings` | Workspace settings |
| `/dashboard/settings/team` | Team members |
| `/dashboard/settings/billing` | Subscription |
| `/dashboard/usage` | Usage analytics |

---

## Environment Variables

```bash
# .env

# Cloudflare (for Drizzle migrations)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_D1_DATABASE_ID=

# Better Auth
BETTER_AUTH_SECRET=          # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Stripe (optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Scripts

```bash
# Development
bun run dev              # Start Next.js dev server

# Database
bun run db:generate      # Generate migrations from schema
bun run db:migrate:local # Apply migrations to local D1
bun run db:migrate       # Apply migrations to remote D1
bun run db:studio        # Open Drizzle Studio

# Build & Deploy
bun run build            # Build for production
bun run deploy           # Deploy to Cloudflare Pages

# Quality
bun run lint             # Run ESLint
bun run typecheck        # Run TypeScript type check
```

---

## Development Guide

### Adding a New API Route

1. Create route file in `apps/web/src/lib/api/routes/`:

```typescript
// apps/web/src/lib/api/routes/example.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()
  .get('/', async (c) => {
    return c.json({ items: [] })
  })
  .post('/', zValidator('json', z.object({ name: z.string() })), async (c) => {
    const { name } = c.req.valid('json')
    return c.json({ id: 'xxx', name })
  })

export default app
```

2. Mount in main app:

```typescript
// apps/web/src/lib/api/index.ts
import example from './routes/example'

app.route('/example', example)
```

3. Use with RPC client:

```typescript
const items = await client.example.$get()
const newItem = await client.example.$post({ json: { name: 'Test' } })
```

### Adding a shadcn Component

```bash
cd apps/web
bunx shadcn@latest add button card dialog
```

### Adding a Database Table

1. Add schema in `packages/db/src/schema/`:

```typescript
// packages/db/src/schema/example.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const examples = sqliteTable('examples', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
```

2. Export from schema index:

```typescript
// packages/db/src/schema/index.ts
export * from './example'
```

3. Generate and apply migration:

```bash
bun run db:generate
bun run db:migrate:local
```

---

## Deployment

### Cloudflare Pages

The app deploys to Cloudflare Pages via OpenNext:

```bash
# Build and deploy
bun run deploy
```

### Required Bindings

Configure these in `apps/web/wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    { "binding": "DB", "database_name": "hare-db", "database_id": "xxx" }
  ],
  "kv_namespaces": [
    { "binding": "KV", "id": "xxx" }
  ],
  "r2_buckets": [
    { "binding": "R2", "bucket_name": "hare-storage" }
  ],
  "vectorize": [
    { "binding": "VECTORIZE", "index_name": "hare-embeddings" }
  ],
  "ai": { "binding": "AI" }
}
```

---

## Pricing

| Tier | Price | Agents | Messages/mo |
|------|-------|--------|-------------|
| **Free** | $0 | 3 | 1,000 |
| **Pro** | $29/mo | 20 | 50,000 |
| **Team** | $99/mo | Unlimited | 500,000 |
| **Enterprise** | Custom | Unlimited | Custom |

---

## Roadmap

- [x] Project scaffolding
- [x] Bun monorepo setup
- [ ] Database schema (Drizzle + D1)
- [ ] Hono API with OpenAPI
- [ ] Better Auth integration
- [ ] Dashboard layout (shadcn/ui)
- [ ] Agent CRUD
- [ ] Agent builder UI
- [ ] Chat playground
- [ ] Agent deployment
- [ ] Usage tracking
- [ ] Stripe billing
- [ ] Team collaboration

---

## License

MIT
