# Hare

> Build and deploy AI agents to Cloudflare's edge in minutes

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![Mastra](https://img.shields.io/badge/Mastra-Powered-purple)](https://mastra.ai)

Hare is a SaaS platform for creating, deploying, and managing AI agents on Cloudflare's global edge network. Built on [Mastra](https://mastra.ai) and powered by Cloudflare Workers, Hare delivers sub-50ms latency from 300+ cities worldwide.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Pages](#pages)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Development Guide](#development-guide)
- [Testing](#testing)
- [Deployment](#deployment)
- [Pricing](#pricing)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

### The Problem

- Building AI agents requires deep infrastructure knowledge
- Traditional serverless has slow cold starts (500ms+ on Lambda)
- Managing agent state, memory, and tools is complex
- Most solutions are either too enterprise-heavy or require self-hosting

### The Solution

Hare provides a visual builder for AI agents that deploy instantly to Cloudflare Workers, with built-in memory (D1/Vectorize), tool libraries, and observability—all without touching infrastructure.

### Why Cloudflare-Native?

| Benefit | Traditional Cloud | Hare (Cloudflare) |
|---------|-------------------|-------------------|
| **Cold Start** | 500ms+ (Lambda) | <50ms |
| **Global Latency** | Single region | 300+ cities |
| **Database** | External (Postgres) | D1 (co-located) |
| **Vector Store** | Pinecone, Weaviate | Vectorize (native) |
| **File Storage** | S3 | R2 (zero egress) |
| **Cache** | Redis/ElastiCache | KV (global) |
| **Pricing** | Unpredictable | Predictable |

---

## Features

### Core Features

- **Visual Agent Builder** - Configure agents via UI, no code required
- **One-Click Deploy** - Agents run on 300+ edge locations worldwide
- **Sub-50ms Latency** - Cloudflare Workers cold starts are instant
- **Built-in Memory** - Conversation history, semantic recall, working memory
- **Tool Library** - HTTP, SQL, KV, R2, Vectorize tools out of the box
- **Version Control** - Track changes, rollback to previous versions
- **API Access** - REST API with streaming support
- **Team Collaboration** - Invite teammates, role-based access
- **Real-time Playground** - Test agents in-browser with streaming
- **Usage Analytics** - Token tracking, latency monitoring, cost insights

### Coming Soon

- **Embed Widget** - Drop-in chat widget for websites
- **Custom Tools** - Build tools with code or HTTP config
- **Scheduled Agents** - Run agents on a cron schedule
- **Multi-Agent Workflows** - Chain agents together
- **Custom Domains** - agents.yourcompany.com
- **Webhooks** - Event notifications for agent activity

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Framework** | [Mastra](https://mastra.ai) | Production-grade agent framework |
| **Runtime** | Cloudflare Workers | Sub-50ms cold starts, global edge |
| **Database** | Cloudflare D1 | Edge SQL, co-located with Workers |
| **ORM** | Drizzle ORM | Type-safe, SQLite-compatible |
| **Cache** | Cloudflare KV | Global key-value store |
| **Storage** | Cloudflare R2 | S3-compatible, zero egress |
| **Vectors** | Cloudflare Vectorize | Native embeddings storage |
| **AI Models** | Workers AI | Llama, Mistral, embeddings |
| **Auth** | Better Auth | Open source, self-hosted |
| **Payments** | Stripe | Subscriptions, usage billing |
| **Frontend** | Next.js 15 | React 19, App Router, RSC |
| **UI** | shadcn/ui + Tailwind | Accessible, customizable |
| **API** | Hono | Lightweight, Workers-native |
| **API Docs** | Scalar | OpenAPI documentation |
| **Monorepo** | Bun Workspaces | Fast, native TypeScript |

---

## Project Structure

### Monorepo Overview

```
hare/
├── apps/
│   └── web/                    # Next.js 15 app (Cloudflare Pages)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/           # Auth pages (sign-in, sign-up)
│       │   │   ├── (dashboard)/      # Protected dashboard routes
│       │   │   │   ├── agents/       # Agent management
│       │   │   │   ├── playground/   # Test agents
│       │   │   │   ├── settings/     # Workspace settings
│       │   │   │   └── billing/      # Subscription management
│       │   │   ├── (marketing)/      # Landing, pricing, docs
│       │   │   └── api/
│       │   │       └── [[...route]]/ # Hono API (catch-all)
│       │   ├── components/           # React components
│       │   │   ├── ui/               # shadcn/ui primitives
│       │   │   ├── agent/            # Agent-specific components
│       │   │   ├── chat/             # Chat components
│       │   │   └── layout/           # Layout components
│       │   ├── lib/
│       │   │   ├── api/              # Hono app + routes
│       │   │   ├── auth/             # Better Auth config
│       │   │   ├── db/               # Drizzle client
│       │   │   └── client.ts         # Hono RPC client
│       │   └── hooks/                # React hooks
│       ├── db/                       # Database (temporarily inside web)
│       │   ├── schema/               # Drizzle table definitions
│       │   ├── migrations/           # SQL migrations
│       │   └── drizzle.config.ts
│       ├── next.config.ts
│       ├── wrangler.jsonc            # Cloudflare Pages config
│       └── package.json
│
├── packages/                   # (Planned for future modularization)
│   ├── db/                     # Shared database package
│   ├── core/                   # Shared types & utils
│   ├── ui/                     # Shared UI components
│   └── auth/                   # Auth configuration
│
├── .env.example                # Environment template
├── package.json                # Root workspace config
├── bun.lockb                   # Bun lockfile
├── CLAUDE.md                   # AI coding guidelines (keep separate)
└── README.md                   # This file
```

### Current Architecture

Currently, the entire application is built as a single Next.js application deployed to Cloudflare Pages. The database schema lives inside `apps/web/db/` and will be extracted to `packages/db/` as the project grows.

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) >= 3.0
- Cloudflare account

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hare.git
cd hare

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Database Setup

```bash
# Create D1 database (if using Cloudflare)
wrangler d1 create hare-db
# Add database_id to wrangler.jsonc

# Navigate to web app directory
cd apps/web

# Generate migrations from schema
bun run db:generate

# Apply migrations locally (for development)
bun run db:migrate:local

# Or apply to remote D1 (for production)
bun run db:migrate:remote
```

**Note**: The migration commands use Wrangler to apply migrations to D1:
- `db:migrate:local` - Applies migrations to a local D1 database for development
- `db:migrate:remote` - Applies migrations to your production D1 database on Cloudflare

### Development

```bash
# Start development server
bun run dev

# Open http://localhost:3000
```

### Preview on Cloudflare Runtime

```bash
# Preview with Cloudflare Pages locally
bun run preview
```

---

## Architecture

### System Overview

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

### Data Flow

```
User Request
    │
    ▼
Next.js Page (RSC)
    │
    ▼
Hono RPC Client
    │
    ▼
Hono API Route
    │
    ├──▶ Better Auth (session validation)
    ├──▶ Drizzle ORM (D1 queries)
    ├──▶ Cloudflare KV (caching)
    └──▶ Mastra Agent (AI execution)
    │
    ▼
Streaming Response (SSE)
    │
    ▼
React Component (updates in real-time)
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   users     │────▶│ workspace_      │◀────│ workspaces  │
│             │     │ members         │     │             │
│ id          │     │                 │     │ id          │
│ email       │     │ user_id         │     │ name        │
│ name        │     │ workspace_id    │     │ slug        │
│ avatar_url  │     │ role            │     │ plan        │
│ created_at  │     │ created_at      │     │ created_at  │
└─────────────┘     └─────────────────┘     └─────────────┘
                                                   │
                                                   │
                           ┌───────────────────────┴───────────────────────┐
                           │                                               │
                           ▼                                               ▼
                    ┌─────────────┐                                 ┌─────────────┐
                    │   agents    │                                 │   tools     │
                    │             │                                 │             │
                    │ id          │                                 │ id          │
                    │ workspace_id│                                 │ workspace_id│
                    │ name        │◀────────────────────────────────│ name        │
                    │ model       │     ┌─────────────────┐         │ type        │
                    │ instructions│     │ agent_tools     │         │ config      │
                    │ config      │────▶│                 │◀────────│ created_at  │
                    │ status      │     │ agent_id        │         └─────────────┘
                    │ created_at  │     │ tool_id         │
                    │ updated_at  │     └─────────────────┘
                    └─────────────┘
                           │
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │ deployments │  │conversations│  │   usage     │
   │             │  │             │  │             │
   │ id          │  │ id          │  │ id          │
   │ agent_id    │  │ agent_id    │  │ workspace_id│
   │ version     │  │ session_id  │  │ tokens_in   │
   │ config_hash │  │ metadata    │  │ tokens_out  │
   │ status      │  │ created_at  │  │ created_at  │
   │ created_at  │  │             │  └─────────────┘
   └─────────────┘  └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  messages   │
                    │             │
                    │ id          │
                    │ convo_id    │
                    │ role        │
                    │ content     │
                    │ tool_calls  │
                    │ tokens      │
                    │ created_at  │
                    └─────────────┘
```

### Key Tables

| Table | Description |
|-------|-------------|
| `users` | Better Auth user accounts |
| `sessions` | Better Auth sessions |
| `workspaces` | Organizations/projects |
| `workspace_members` | User membership with roles |
| `agents` | AI agent configurations |
| `tools` | Custom tool definitions |
| `agent_tools` | Many-to-many agent<->tool |
| `conversations` | Chat sessions |
| `messages` | Chat messages |
| `deployments` | Agent deployment history |
| `usage` | Token/request metrics |

---

## API Reference

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

### Documentation

| Path | Description |
|------|-------------|
| `/api/docs` | Scalar API documentation |
| `/api/openapi.json` | OpenAPI specification |

### Example: Create Agent

```bash
POST /api/agents
Content-Type: application/json
X-Workspace-ID: ws_abc123

{
  "name": "Customer Support",
  "description": "Handles customer inquiries",
  "model": "llama-3.1-70b-instruct",
  "instructions": "You are a helpful customer support agent for Acme Corp...",
  "config": {
    "temperature": 0.7,
    "maxTokens": 4096,
    "memory": {
      "enabled": true,
      "maxMessages": 100
    }
  },
  "toolIds": ["tool_abc123", "tool_def456"]
}
```

### Example: Chat with Agent (Streaming)

```bash
POST /api/agents/agent_xyz789/chat
Content-Type: application/json

{
  "message": "How do I reset my password?",
  "sessionId": "session_user123",
  "metadata": {
    "userId": "user_abc",
    "plan": "pro"
  }
}

# Response (SSE stream)
event: message
data: {"type": "text", "content": "I'd be happy to help..."}

event: tool_call
data: {"type": "tool_call", "tool": "search_kb", "input": {...}}

event: tool_result
data: {"type": "tool_result", "tool": "search_kb", "output": {...}}

event: done
data: {"type": "done", "usage": {"tokensIn": 150, "tokensOut": 89}}
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

Create a `.env` file based on `.env.example`:

```bash
# Cloudflare (for Drizzle migrations)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_D1_DATABASE_ID=your_database_id

# Better Auth
BETTER_AUTH_SECRET=your_secret_here  # openssl rand -base64 32
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
bun run preview          # Preview on Cloudflare runtime

# Database
bun run db:generate      # Generate migrations from schema
bun run db:migrate:local # Apply migrations to local D1 (development)
bun run db:migrate:remote # Apply migrations to remote D1 (production)
bun run db:push          # Push schema changes to database (alternative)
bun run db:studio        # Open Drizzle Studio

# Build & Deploy
bun run build            # Build for production
bun run deploy           # Deploy to Cloudflare Pages

# Quality
bun run lint             # Run ESLint
bun run typecheck        # Run TypeScript type check
bun run format           # Format code with Prettier
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

1. Add schema in `apps/web/db/schema/`:

```typescript
// apps/web/db/schema/example.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const examples = sqliteTable('examples', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
```

2. Export from schema index:

```typescript
// apps/web/db/schema/index.ts
export * from './example'
```

3. Generate and apply migration:

```bash
bun run db:generate
bun run db:migrate:local
```

---

## Testing

```bash
# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

Example test file:

```typescript
// index.test.ts
import { test, expect } from "bun:test"

test("hello world", () => {
  expect(1).toBe(1)
})
```

---

## Deployment

### Cloudflare Pages

The app deploys to Cloudflare Pages:

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

### Setting Up Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create hare-db

# Create KV namespace
wrangler kv:namespace create "KV"

# Create R2 bucket
wrangler r2 bucket create hare-storage

# Create Vectorize index
wrangler vectorize create hare-embeddings --dimensions 1536 --metric cosine
```

---

## Pricing

| Tier | Price | Agents | Messages/mo | Features |
|------|-------|--------|-------------|----------|
| **Free** | $0 | 3 | 1,000 | Playground, Community support |
| **Pro** | $29/mo | 20 | 50,000 | Custom domains, Priority support |
| **Team** | $99/mo | Unlimited | 500,000 | Team seats, API priority, Analytics |
| **Enterprise** | Custom | Unlimited | Custom | SSO, Audit logs, SLA, Dedicated support |

---

## Roadmap

### Current Status

- [x] Project scaffolding
- [x] Bun monorepo setup
- [x] Next.js 15 app with Cloudflare Pages
- [x] Database schema design (Drizzle + D1)
- [ ] Better Auth integration
- [ ] Hono API with OpenAPI
- [ ] Dashboard layout (shadcn/ui)
- [ ] Agent CRUD
- [ ] Agent builder UI
- [ ] Chat playground
- [ ] Agent deployment
- [ ] Usage tracking
- [ ] Stripe billing
- [ ] Team collaboration

### Planned Features

**Phase 1: Foundation (Weeks 1-2)**
- Database setup and migrations
- Auth implementation (Better Auth)
- Basic API structure (Hono)
- Dashboard layout

**Phase 2: Core Features (Weeks 3-5)**
- Agent builder UI
- Model selector
- Instructions editor
- Tool library
- Chat playground
- Agent deployment

**Phase 3: Advanced Features (Weeks 6-8)**
- Vector memory (Vectorize)
- Custom tools
- Team collaboration
- Usage analytics
- Billing integration

**Phase 4: Enterprise (Weeks 9-12)**
- SSO/SAML
- Audit logs
- Custom domains
- Webhooks
- Multi-agent workflows

---

## Contributing

We welcome contributions! Please see our contributing guidelines (coming soon).

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/hare.git`
3. Install dependencies: `bun install`
4. Create a branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Run tests: `bun test`
7. Commit with gitmoji: `git commit -m "✨ Add new feature"`
8. Push and create a pull request

### Commit Convention

We use [gitmoji](https://gitmoji.dev/) for commit messages:

- ✨ `:sparkles:` - New feature
- 🐛 `:bug:` - Bug fix
- 📝 `:memo:` - Documentation
- ♻️ `:recycle:` - Refactoring
- ✅ `:white_check_mark:` - Tests
- 🎨 `:art:` - UI/UX improvements

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with**

- [Next.js](https://nextjs.org/) - React framework
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge compute
- [Mastra](https://mastra.ai) - Agent framework
- [Drizzle](https://orm.drizzle.team/) - TypeScript ORM
- [Better Auth](https://www.better-auth.com/) - Authentication
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Hono](https://hono.dev/) - Web framework
- [Bun](https://bun.sh/) - JavaScript runtime

---

For AI coding guidelines, see [CLAUDE.md](CLAUDE.md).
