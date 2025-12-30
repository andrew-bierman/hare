# 🐇 Hare

> **Fast as a hare**—Build and deploy AI agents to Cloudflare's edge in minutes

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF)](https://vitejs.dev/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![Workers AI](https://img.shields.io/badge/Workers_AI-Native-F38020)](https://developers.cloudflare.com/workers-ai/)

Hare is a SaaS platform for creating, deploying, and managing AI agents on Cloudflare's global edge network. Just like its namesake, Hare is built for **speed** ⚡—delivering lightning-fast agent responses with sub-50ms cold starts from 300+ cities worldwide.

Built as a **Cloudflare-native** platform using Workers AI, D1, KV, R2, and Vectorize, Hare eliminates the infrastructure complexity of traditional AI agent platforms. No more waiting for slow cold starts or dealing with complex deployment pipelines—your agents hop from development to production in seconds.

---

## Table of Contents

- [Overview](#overview)
  - [Why "Hare"?](#-why-hare)
  - [The Problem](#the-problem)
  - [The Solution](#the-solution)
  - [Why Cloudflare-Native?](#why-cloudflare-native)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Worktree Development](#worktree-development)
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
  - [Current Focus](#-current-focus)
  - [Milestones](#-milestones)
  - [Technical Decisions](#️-technical-decisions)
- [Contributing](#contributing)
- [FAQ](#faq)
- [License](#license)

---

## Overview

### 🐰 Why "Hare"?

In Aesop's fable, the hare was famous for its speed (if not its patience). We built Hare to be the **fastest** way to build and deploy AI agents—no slow cold starts, no infrastructure headaches, just pure speed powered by Cloudflare's global edge network.

Like a hare bounding across the landscape, your AI agents hop instantly across 300+ edge locations worldwide, responding to users in under 50ms. Fast development, fast deployment, fast execution. That's the Hare way. 🚀

### The Problem

- 🐌 **Slow Cold Starts**: Building AI agents on traditional serverless (Lambda, etc.) means 500ms+ cold starts
- 🛠️ **Complex Infrastructure**: Deep infrastructure knowledge required to manage agent state, memory, and tools
- 💰 **Unpredictable Costs**: Most solutions have complex pricing that's hard to predict
- 🏢 **Wrong Fit**: Solutions are either too enterprise-heavy or require self-hosting

### The Solution

Hare provides a **visual builder** for AI agents that deploy instantly to Cloudflare Workers, with built-in memory (D1/Vectorize), tool libraries, and observability—all without touching infrastructure. Build once, deploy everywhere, run fast. 🐇💨

### Why Cloudflare-Native?

| Benefit | Traditional Cloud | Hare (Cloudflare) |
|---------|-------------------|-------------------|
| **Cold Start** | 🐌 500ms+ (Lambda) | ⚡ <50ms |
| **Global Latency** | 🌍 Single region | 🌐 300+ cities |
| **Database** | 🔌 External (Postgres) | 💾 D1 (co-located) |
| **Vector Store** | 📊 Pinecone, Weaviate | 🎯 Vectorize (native) |
| **File Storage** | 💸 S3 (egress fees) | 📦 R2 (zero egress) |
| **Cache** | 🔴 Redis/ElastiCache | ⚡ KV (global) |
| **Pricing** | ❓ Unpredictable | ✅ Predictable |

---

## Features

### ✨ Core Features

- **🎨 Visual Agent Builder** - Configure agents via UI, no code required
- **⚡ One-Click Deploy** - Agents run on 300+ edge locations worldwide (as fast as a hare!)
- **🚀 Sub-50ms Latency** - Cloudflare Workers cold starts are nearly instant
- **🧠 Built-in Memory** - Conversation history, semantic recall, working memory
- **🛠️ Tool Library** - 57 built-in tools (HTTP, SQL, KV, R2, AI, validation, and more)
- **📜 Version Control** - Track changes, rollback to previous versions
- **🔌 API Access** - REST API with streaming support
- **👥 Team Collaboration** - Invite teammates, role-based access
- **📊 Usage Analytics** - Token tracking, latency monitoring, cost insights
- **🔌 MCP Support** - Model Context Protocol for external AI clients (Claude Desktop, Cursor)
- **🌐 WebSocket Real-time** - Live agent communication with state sync
- **🏥 Health Monitoring** - Liveness/readiness probes for all services

### 🔮 Coming Soon

- **💬 Embed Widget** - Drop-in chat widget for websites
- **🔧 Custom Tools** - Build tools with code or HTTP config
- **⏰ Scheduled Agents** - Run agents on a cron schedule
- **🔗 Multi-Agent Workflows** - Chain agents together for complex tasks
- **🌐 Custom Domains** - agents.yourcompany.com
- **📣 Webhooks** - Event notifications for agent activity

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **🤖 AI SDK** | [Vercel AI SDK](https://sdk.vercel.ai/) | Streaming, tool calling, edge-compatible |
| **🐇 Agents** | [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/) | Stateful agents with Durable Objects |
| **⚡ Runtime** | Cloudflare Workers | Sub-50ms cold starts, global edge |
| **🏠 State** | Durable Objects | Stateful agent instances with WebSocket |
| **💾 Database** | Cloudflare D1 | Edge SQL, co-located with Workers |
| **🔍 ORM** | Drizzle ORM | Type-safe, SQLite-compatible |
| **⚡ Cache** | Cloudflare KV | Global key-value store |
| **📦 Storage** | Cloudflare R2 | S3-compatible, zero egress fees |
| **🎯 Vectors** | Cloudflare Vectorize | Native embeddings storage |
| **🧠 AI Models** | Workers AI | Llama 3.3, Mistral, embeddings |
| **🔐 Auth** | Better Auth | Open source, self-hosted |
| **💳 Payments** | Stripe | Subscriptions, usage billing |
| **⚛️ Frontend** | Vite 7 + TanStack | React 19, TanStack Router, TanStack Query |
| **🎨 UI** | shadcn/ui + Tailwind | Accessible, customizable components |
| **🔌 API** | Hono | Lightweight, Workers-native framework |
| **📚 API Docs** | Scalar | Beautiful OpenAPI documentation |
| **🔗 MCP** | Model Context Protocol | External AI client integration |
| **🏃 Runtime** | Bun 1.3.5 | Fast, native TypeScript runtime |

---

## Project Structure

### 📁 Monorepo Overview

```
hare/
├── apps/
│   └── web/                    # Vite + TanStack app (Cloudflare Workers)
│       ├── src/
│       │   ├── routes/               # TanStack Router pages
│       │   │   ├── (auth)/           # Auth pages (sign-in, sign-up)
│       │   │   ├── (dashboard)/      # Protected dashboard routes
│       │   │   │   ├── agents/       # Agent management
│       │   │   │   ├── settings/     # Workspace settings
│       │   │   │   └── billing/      # Subscription management
│       │   │   └── (marketing)/      # Landing, pricing, docs
│       │   ├── components/           # React components
│       │   │   ├── ui/               # shadcn/ui primitives
│       │   │   ├── agent/            # Agent-specific components
│       │   │   ├── chat/             # Chat components
│       │   │   ├── layout/           # Layout components
│       │   │   └── providers/        # React context providers
│       │   ├── lib/
│       │   │   ├── api/              # Hono app + routes
│       │   │   │   ├── routes/       # API route handlers (11 modules)
│       │   │   │   ├── middleware/   # Auth, workspace middleware
│       │   │   │   └── hooks/        # React Query hooks
│       │   │   ├── agents/           # Cloudflare Agents SDK
│       │   │   │   ├── hare-agent.ts # Main agent (Durable Object)
│       │   │   │   ├── mcp-agent.ts  # MCP server agent
│       │   │   │   ├── tools/        # 57 tool implementations
│       │   │   │   └── providers/    # LLM providers (Workers AI)
│       │   │   ├── auth/             # Better Auth config
│       │   │   └── client.ts         # Hono RPC client
│       │   ├── db/                   # Database layer
│       │   │   ├── schema/           # Drizzle table definitions
│       │   │   ├── client.ts         # Database client
│       │   │   └── types.ts          # TypeScript types
│       │   └── hooks/                # Custom React hooks
│       ├── migrations/               # SQL migrations (D1)
│       ├── drizzle.config.ts         # Drizzle configuration
│       ├── vite.config.ts            # Vite configuration
│       ├── wrangler.jsonc            # Cloudflare Workers config
│       └── package.json
│
├── packages/                   # Shared packages
│   ├── ui/                     # Shared UI components
│   ├── e2e/                    # End-to-end tests (Playwright)
│   └── typescript-config/      # Shared TypeScript configs
│
├── .env.local.example          # Environment template
├── package.json                # Root workspace config
├── bun.lockb                   # Bun lockfile
├── turbo.json                  # Turborepo configuration
├── CLAUDE.md                   # AI coding guidelines
└── README.md                   # This file
```

### 🏗️ Current Architecture

The application is built as a **Vite + TanStack Router application** deployed to Cloudflare Workers. The database schema lives in `packages/db/src/schema/` and is designed to work with Cloudflare D1 (SQLite-compatible).

---

## Quick Start

### 📋 Prerequisites

- **[Bun](https://bun.sh)** >= 1.3.5 (recommended) or Node.js >= 20
- **[Wrangler](https://developers.cloudflare.com/workers/wrangler/)** >= 3.0 (Cloudflare CLI)
- Cloudflare account (free tier works!)

### ⚡ Installation

```bash
# Clone the repository
git clone https://github.com/andrew-bierman/hare.git
cd hare

# Install dependencies (fast with Bun! 🐇)
bun install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

**💡 Environment File Management:**

Hare uses an environment shim script to automatically generate app-specific environment files from a single root `.env.local` file. When you run `bun install`:

- `.env.local` → `apps/web/.env.local` (for Vite, `VITE_*` prefix exposes to client)
- `.env.local` → `apps/web/.dev.vars` (for Cloudflare Workers, server-side only)

This ensures consistency across your monorepo and follows Cloudflare's convention of using `.dev.vars` for local development instead of `.env`.

### 🗄️ Database Setup

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

**💡 Note**: The migration commands use Wrangler to apply migrations to D1:
- `db:migrate:local` - Applies migrations to a local D1 database for development
- `db:migrate:remote` - Applies migrations to your production D1 database on Cloudflare

### 🚀 Development

```bash
# Start development server (with Turbopack ⚡)
bun run dev

# Open http://localhost:3000
```

### 👀 Preview on Cloudflare Runtime

```bash
# Preview with Cloudflare Pages locally (tests the actual deployment environment)
bun run preview
```

---

## Worktree Development

When using git worktrees (e.g., with [claude-squad](https://github.com/smtg-ai/claude-squad) or similar tools), each worktree needs its own local development environment with a unique port to avoid conflicts.

**Note:** The API and app run on the **same port** via the Cloudflare Vite plugin.

### Quick Setup (Recommended)

Run the automated setup script:

```bash
bun run setup:worktree
```

This script will:
1. Install dependencies (`bun install`)
2. Create `.env.local` from template (if missing)
3. Generate a unique `BETTER_AUTH_SECRET`
4. Configure a unique port based on your worktree path (3001-3099)
5. Regenerate environment files
6. Run local database migrations

### Manual Setup

If you prefer manual setup or need to customize the port:

```bash
# 1. Install dependencies
bun install

# 2. Create environment file
cp .env.local.example .env.local

# 3. Generate auth secret
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local

# 4. Choose a unique port (default: 3000, worktrees: 3001-3099)

# 5. Update .env.local with your port (SAME port for both!)
#    BETTER_AUTH_URL=http://localhost:3050
#    VITE_APP_URL=http://localhost:3050

# 6. Regenerate environment files
bun run scripts/env.ts

# 7. Run database migrations
bun run db:migrate:local
```

### Starting the Dev Server

Use the PORT environment variable:

```bash
# Check your configured port
cat .worktree-config

# Start with custom port
PORT=3050 bun run dev
```

### Troubleshooting

**Port conflicts (`EADDRINUSE`)**:
```bash
# Find what's using a port
lsof -i :3000

# Use a different port
PORT=3050 bun run dev
```

**Missing environment variables**:
```bash
# Regenerate env files
bun run scripts/env.ts
```

---

## Architecture

### 🏗️ System Overview

The entire app runs as a single Vite + TanStack application deployed to Cloudflare Workers:

```
┌─────────────────────────────────────────────────────────────────┐
│                  🐇 apps/web (Vite + TanStack)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 ⚛️ React Frontend                        │   │
│  │  • Dashboard pages (TanStack Router)                     │   │
│  │  • shadcn/ui components                                  │   │
│  │  • Hono RPC client for type-safe API calls               │   │
│  │  • TanStack Query for data fetching                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           🔌 /api/[[...route]] (Hono)                    │   │
│  │  • REST endpoints with OpenAPI/Scalar docs               │   │
│  │  • Better Auth handlers                                  │   │
│  │  • Zod validation                                        │   │
│  │  • Type-safe RPC exports                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ☁️ Cloudflare Services                      │   │
│  │  • D1 (SQLite) via Drizzle ORM                          │   │
│  │  • KV for sessions/cache                                 │   │
│  │  • R2 for file storage                                   │   │
│  │  • Vectorize for embeddings                              │   │
│  │  • Workers AI for inference                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 🔌 Hono API

The API is built with Hono and runs directly on Cloudflare Workers via the Vite plugin:

```typescript
// apps/web/src/server.ts
import { app } from '@hare/api'

export default app
```

### 🎯 Hono RPC Client

Type-safe API calls from React components (no manual fetch calls needed!):

```typescript
// apps/web/src/lib/client.ts
import { hc } from 'hono/client'
import type { AppType } from '@hare/api'

export const client = hc<AppType>('/api')

// Usage in components - fully typed! ✨
const agents = await client.agents.$get()
const agent = await client.agents[':id'].$get({ param: { id: 'xxx' } })
```

### 🔄 Data Flow

```
User Request (Browser)
    │
    ▼
⚛️ React Page (TanStack Router)
    │
    ▼
🔌 Hono RPC Client (Type-safe)
    │
    ▼
🛣️ Hono API Route
    │
    ├──▶ 🔐 Better Auth (session validation)
    ├──▶ 💾 Drizzle ORM (D1 queries)
    ├──▶ ⚡ Cloudflare KV (caching)
    └──▶ 🤖 Workers AI (AI execution)
    │
    ▼
📡 Streaming Response (SSE)
    │
    ▼
✨ React Component (updates in real-time)
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
| `POST` | `/api/agents/:id/deploy` | Deploy agent to edge (returns endpoints) |
| `GET` | `/api/agents/:id/deployment` | Get deployment info and endpoints |
| `POST` | `/api/agents/validate` | Validate agent configuration |

### Agent WebSocket/Chat Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/agents/:id/ws` | WebSocket connection to agent |
| `POST` | `/api/agents/:id/chat` | HTTP chat with agent (via Durable Object) |
| `GET` | `/api/agents/:id/state` | Get agent state |
| `POST` | `/api/agents/:id/configure` | Configure agent Durable Object |
| `GET` | `/api/agents/:id/schedules` | Get scheduled tasks |

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

### Health Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Full system health status (DB, KV, R2, AI) |
| `GET` | `/api/health/live` | Liveness probe (is service running?) |
| `GET` | `/api/health/ready` | Readiness probe (can accept traffic?) |

### Analytics Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics` | Get comprehensive analytics data |

### MCP Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/mcp/:workspaceId` | WebSocket upgrade for MCP connection |
| `GET` | `/api/mcp/:workspaceId/info` | Get MCP server info and capabilities |

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
  "model": "llama-3.3-70b",
  "instructions": "You are a helpful customer support agent for Acme Corp...",
  "config": {
    "temperature": 0.7,
    "maxTokens": 4096
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

### 🏠 Marketing

| Path | Description |
|------|-------------|
| `/` | Landing page with hero and features |
| `/pricing` | Pricing tiers and plans |
| `/docs` | Documentation and guides |

### 🔐 Auth

| Path | Description |
|------|-------------|
| `/sign-in` | Sign in form (email + OAuth) |
| `/sign-up` | Sign up form (email + OAuth) |

### 📊 Dashboard

| Path | Description |
|------|-------------|
| `/dashboard` | Overview / home |
| `/dashboard/agents` | Agent list and management |
| `/dashboard/agents/new` | Create new agent |
| `/dashboard/agents/[id]` | Agent builder / configuration |
| `/dashboard/agents/[id]/settings` | Agent settings |
| `/dashboard/tools` | Tool library and management |
| `/dashboard/settings` | Workspace settings |
| `/dashboard/settings/team` | Team members management |
| `/dashboard/settings/billing` | Subscription and billing |
| `/dashboard/usage` | Usage analytics and insights |

---

## Environment Variables

Hare uses a **monorepo environment shim** to manage environment variables across different apps. Create a `.env.local` file at the root based on `.env.local.example`, and the shim script will automatically generate app-specific files during `bun install`.

### Setup

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit with your credentials
# The postinstall script will automatically generate:
# - apps/web/.env.local (for Vite)
# - apps/web/.dev.vars (for Cloudflare Workers)
```

### Environment Variables Reference

```bash
# ☁️ Cloudflare (for Drizzle migrations)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_D1_DATABASE_ID=your_database_id

# 🔐 Better Auth
BETTER_AUTH_SECRET=your_secret_here  # Generate with: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# 🎛️ Feature Flags
ENABLE_AI_CHAT=true                             # Global enable/disable for AI chat
AI_CHAT_BETA_MODE=true                          # Restrict to specific users (beta)
AI_CHAT_ALLOWED_EMAILS=user1@example.com,user2@example.com  # Allowed emails

# 🔑 OAuth Providers (optional - for social login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# 💳 Stripe (optional - for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# 🌐 App Configuration
VITE_APP_URL=http://localhost:3000
```

### How It Works

The environment shim script (`scripts/env.ts`) runs automatically during `bun install` and:

1. **Reads** the root `.env.local` file
2. **Generates** `apps/web/.env.local` with all variables (`VITE_*` prefix exposes to client)
3. **Generates** `apps/web/.dev.vars` with only server-side variables (excludes `VITE_*`)

This approach:
- ✅ Maintains a single source of truth for environment variables
- ✅ Follows Cloudflare's convention of using `.dev.vars` for Workers
- ✅ Uses Vite's `VITE_*` prefix for client-side variables
- ✅ Prevents accidental exposure of server-side secrets
- ✅ Skips generation in CI environments

**💡 Tips:**
- Copy `.env.local.example` to `.env.local` to get started: `cp .env.local.example .env.local`
- Generate a secure auth secret: `openssl rand -base64 32`
- Get your Cloudflare credentials from the [Cloudflare Dashboard](https://dash.cloudflare.com/)
- OAuth credentials can be obtained from [Google Cloud Console](https://console.cloud.google.com/) and [GitHub Settings](https://github.com/settings/developers)
- To manually regenerate environment files: `bun run scripts/env.ts`

---

## Security Features

Hare includes comprehensive security measures to protect your application and data:

### 🎛️ Feature Flags

Flexible feature control with optional user-specific access:

- **Global Control**: Enable/disable AI chat features with `ENABLE_AI_CHAT` environment variable
- **Beta Mode**: Set `AI_CHAT_BETA_MODE=true` to restrict access to specific users
- **Email Allowlist**: Specify allowed users with `AI_CHAT_ALLOWED_EMAILS` (comma-separated)
- **No Database Required**: All configuration via environment variables
- **Perfect for Beta**: Enable feature for 4-5 users in production while testing
- **Emergency Disable**: Set `ENABLE_AI_CHAT=false` to disable globally

**Example Configuration:**
```bash
# Production beta: enable for specific users only
ENABLE_AI_CHAT=true
AI_CHAT_BETA_MODE=true
AI_CHAT_ALLOWED_EMAILS=alice@company.com,bob@company.com,charlie@company.com

# After beta: enable for everyone
ENABLE_AI_CHAT=true
AI_CHAT_BETA_MODE=false
```

### 🚦 Rate Limiting

Protects against abuse with configurable rate limits:

- **Per-User Limits**: 100 requests/hour and 50,000 tokens/hour per user (configurable)
- **Time Windows**: Rolling 1-hour windows for rate limit tracking
- **Response Headers**: `X-RateLimit-*` headers show remaining quota
- **IP Tracking**: Records IP addresses and user agents for monitoring
- **Automatic Cleanup**: Rate limit windows reset automatically

### 🛡️ Security Headers

All API responses include security headers:

- **CSP**: Content Security Policy to prevent XSS attacks
- **HSTS**: Strict Transport Security for HTTPS enforcement
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Referrer Policy**: Controls referrer information
- **Permissions Policy**: Restricts browser features

### 🔐 CORS Configuration

Secure cross-origin resource sharing:

- **Allowed Origins**: Configurable via environment variables
- **Credentials Support**: Allows cookies for authentication
- **Method Restrictions**: Only allows necessary HTTP methods
- **Header Control**: Exposes rate limit headers

### 🧹 Input Sanitization

Comprehensive input validation and sanitization:

- **XSS Protection**: HTML entity encoding for user input
- **Path Traversal Prevention**: Filename and URL sanitization
- **SQL Injection**: All queries use parameterized statements (Drizzle ORM)
- **Metadata Cleaning**: Removes dangerous object properties
- **Content Validation**: Checks agent instructions for suspicious patterns

### 🔍 Security Scanning

Automated security checks:

- **CodeQL Analysis**: Continuous security scanning (currently 0 issues)
- **Dependency Scanning**: Regular checks for vulnerable packages
- **TypeScript Strict Mode**: Catches potential issues at compile time

### 📊 Audit Trail

Track usage and access:

- **Usage Tracking**: Records all API calls with metadata
- **Last Access**: Tracks when beta users last used AI features
- **IP and User Agent**: Logged for rate limiting and security monitoring

### 🔑 API Key Management

Secure API key system (in usage table):

- **Hashed Storage**: Keys are hashed before storage
- **Scoped Permissions**: Keys can be limited to specific agents/endpoints
- **Expiration**: Optional expiration dates for temporary access
- **Usage Tracking**: Last used timestamp for each key

### 📝 Best Practices

When deploying to production:

1. **Control Features**: Use `ENABLE_AI_CHAT=false` to disable features during rollout
2. **Use HTTPS**: Always use SSL/TLS certificates
3. **Rotate Secrets**: Change `BETTER_AUTH_SECRET` regularly
4. **Monitor Usage**: Check rate limit logs for suspicious activity
5. **Update Dependencies**: Keep packages up to date
6. **Configure CORS**: Set strict allowed origins
7. **Review Logs**: Monitor error logs for security issues

---

## Scripts

All scripts can be run from the root directory using Bun:

### 🚀 Development

```bash
bun run dev              # Start dev server (Vite + Cloudflare Workers)
bun run preview          # Preview on Cloudflare runtime (tests actual deployment)
bun run setup:worktree   # Set up local environment for worktree development
```

### 🗄️ Database

```bash
bun run db:generate      # Generate migrations from schema changes
bun run db:migrate:local # Apply migrations to local D1 (development)
bun run db:migrate:remote # Apply migrations to remote D1 (production)
bun run db:push          # Push schema changes directly (skip migrations)
bun run db:studio        # Open Drizzle Studio (visual database browser)
```

### 🏗️ Build & Deploy

```bash
bun run build            # Build for production
bun run deploy           # Deploy to Cloudflare Pages
bun run upload           # Build and upload to Cloudflare (without deploy)
```

### ✅ Quality & Testing

```bash
bun run lint             # Run Biome linter
bun run lint:fix         # Auto-fix lint issues
bun run format           # Format code with Biome
bun run check            # Run all checks (lint + format)
bun run check:fix        # Auto-fix all issues
bun run typecheck        # Run TypeScript type checking
bun run test             # Run tests with Vitest
bun run test:watch       # Run tests in watch mode
bun run test:ui          # Open Vitest UI
```

### 🧹 Cleanup

```bash
bun run clean            # Remove all node_modules and build artifacts
bun run clean:cache      # Remove build caches (.turbo)
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

### 🧪 Running Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode (auto-rerun on changes)
bun run test:watch

# Run tests with UI (visual test runner)
bun run test:ui

# Run unit tests only
bun run test:unit

# Run E2E tests (Playwright)
bun run test:e2e

# Run tests with coverage report
bun run test:coverage
```

### 📊 Test Coverage

Hare uses **Vitest** with v8 coverage provider. Coverage is configured with **90% thresholds** for lines, functions, branches, and statements.

Coverage reports are generated in multiple formats:
- Text summary (console output)
- HTML report (`coverage/index.html`)
- JSON report (`coverage/coverage-final.json`)
- LCOV report (`coverage/lcov.info`)

To view the HTML coverage report:
```bash
open coverage/index.html
```

### ✍️ Writing Tests

Hare uses **Vitest** for unit tests and **Playwright** for end-to-end tests.

Example unit test:

```typescript
// apps/web/src/lib/api/__tests__/types.test.ts
import { describe, expect, it } from 'vitest'
import { isWorkspaceRole } from '../types'

describe('isWorkspaceRole', () => {
  it('returns true for valid workspace roles', () => {
    expect(isWorkspaceRole('owner')).toBe(true)
    expect(isWorkspaceRole('admin')).toBe(true)
  })

  it('returns false for invalid workspace roles', () => {
    expect(isWorkspaceRole('superadmin')).toBe(false)
  })
})
```

Example E2E test:

```typescript
// packages/e2e/tests/home.spec.ts
import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Hare/)
})
```

### 🧪 Test Structure

Unit tests are located in `__tests__` directories alongside source files:
- API tests: `apps/web/src/lib/api/__tests__/`
- Middleware tests: `apps/web/src/lib/api/middleware/__tests__/`
- Provider tests: `apps/web/src/lib/agents/providers/__tests__/`
- Tool tests: `apps/web/src/lib/agents/tools/__tests__/`
- UI tests: `packages/ui/src/lib/__tests__/`

E2E tests are in dedicated directories:
- Web app: `apps/web/e2e/`
- Shared: `packages/e2e/`

---

## Deployment

### ☁️ Cloudflare Workers

Hare deploys to Cloudflare Workers using the Vite Cloudflare plugin:

```bash
# Build and deploy to Cloudflare Workers
bun run deploy

# Build without deploying (for CI/CD)
bun run build

# Upload to Cloudflare without deploying
bun run upload
```

### 🔧 Required Cloudflare Bindings

Configure these in `apps/web/wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    { "binding": "DB", "database_name": "hare-db", "database_id": "your-db-id" }
  ],
  "kv_namespaces": [
    { "binding": "KV", "id": "your-kv-id" }
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

### 🚀 Setting Up Cloudflare Resources

Create the required Cloudflare resources using Wrangler:

```bash
# Create D1 database (SQLite on the edge)
wrangler d1 create hare-db

# Create KV namespace (global key-value store)
wrangler kv:namespace create "KV"

# Create R2 bucket (object storage with zero egress fees)
wrangler r2 bucket create hare-storage

# Create Vectorize index (vector database for embeddings)
wrangler vectorize create hare-embeddings --dimensions 1536 --metric cosine

# Workers AI is automatically available (no setup needed!)
```

After creating these resources, copy their IDs to your `wrangler.jsonc` configuration file.

---

## Pricing

Hare pricing is designed to be simple and predictable (no surprise bills! 💰):

| Tier | Price | Agents | Messages/mo | Features |
|------|-------|--------|-------------|----------|
| **🆓 Free** | $0/mo | 3 | 1,000 | Community support, Core features |
| **⚡ Pro** | $29/mo | 20 | 50,000 | Custom domains, Priority support, Advanced analytics |
| **👥 Team** | $99/mo | Unlimited | 500,000 | Team seats, API priority, Usage analytics, SSO |
| **🏢 Enterprise** | Custom | Unlimited | Custom | Everything + Audit logs, SLA, Dedicated support |

> **Note**: These pricing tiers are planned for the future. Currently, Hare is in development and free to use! 🎉

---

## Roadmap

> **Where we are**: Hare has a solid foundation with full backend infrastructure, AI agent execution engine, streaming chat, MCP support, and Cloudflare Agents SDK integration. We're now focused on polishing the frontend experience and adding production features.

### 🔥 Current Focus

**What we're actively building right now:**

| Priority | Item | Status | Difficulty |
|----------|------|--------|------------|
| ✅ | Visual tool picker in agent builder | Complete | `medium` |
| ✅ | Rich instructions editor (CodeMirror) | Complete | `medium` |
| ✅ | Analytics dashboard with charts | Complete | `medium` |
| ✅ | MCP (Model Context Protocol) support | Complete | `hard` |
| ✅ | Cloudflare Agents SDK integration | Complete | `hard` |
| ✅ | Health monitoring endpoints | Complete | `medium` |
| ✅ | WebSocket real-time agent communication | Complete | `hard` |
| ✅ | OAuth providers (Google, GitHub) | Complete | `medium` |
| ✅ | Configuration validation and preview | Complete | `easy` |
| ✅ | Workers deployment pipeline | Complete | `hard` |
| 🥇 | Embed chat widget | Up Next | `medium` |

**Want to help?** Items marked `easy` are great for first-time contributors! See [How to Contribute](#-how-to-contribute) below.

---

### 🏁 Milestones

| Version | Codename | Target | Key Features |
|---------|----------|--------|--------------|
| `v0.1.0` | **Sprinter** | ✅ Complete | Agent builder, 57 tools, streaming API |
| `v0.2.0` | **Dasher** | 🚧 In Progress | MCP, Agents SDK, Analytics, Health checks |
| `v0.3.0` | **Racer** | Planned | Billing, teams, custom tools, workflows |
| `v1.0.0` | **Hare** | Planned | Enterprise features, SSO, SLA |

---

### 🎯 Progress Overview

```
Foundation    ████████████████████ 100%  ✅ Complete
Core Features █████████████████░░░  85%  🚧 In Progress
Production    ██████████░░░░░░░░░░  50%  🚧 In Progress
Advanced      ██░░░░░░░░░░░░░░░░░░  10%  📋 Started
Enterprise    ░░░░░░░░░░░░░░░░░░░░   0%  📋 Planned
```

---

### ✅ Phase 0: Foundation (Complete)

**Infrastructure & Architecture** - *100% Complete*

All core infrastructure is in place and production-ready:

- [x] 🏗️ **Monorepo Setup** - Turborepo + Bun 1.3.5 for blazing-fast builds
- [x] ⚡ **Vite + TanStack App** - Deployed to Cloudflare Workers with @cloudflare/vite-plugin
- [x] 💾 **Database Layer** - Complete D1 schema with Drizzle ORM
  - [x] Multi-tenant workspaces with role-based access
  - [x] Agent configurations with versioning support
  - [x] Tool registry and agent-tool associations
  - [x] Conversation history and message storage
  - [x] Deployment tracking and usage metrics
- [x] 🔌 **Type-Safe API** - Hono with OpenAPI + RPC client
  - [x] 11 complete route modules: agents, workspaces, tools, chat, usage, auth, analytics, health, mcp, agent-ws, dev
  - [x] Zod validation on all endpoints
  - [x] Middleware for auth and workspace context
  - [x] OpenAPI docs with Scalar UI at `/api/docs`
- [x] 🤖 **AI Agent Engine** - Production-ready execution layer
  - [x] Vercel AI SDK integration for streaming
  - [x] Workers AI provider with model abstraction
  - [x] 57 built-in tools across 11 categories
  - [x] Memory system with conversation persistence
  - [x] Tool calling and result handling
- [x] 🎨 **UI Foundation** - shadcn/ui component library integrated
  - [x] Layout components (header, sidebar, navigation)
  - [x] Workspace switcher and user menu
  - [x] Form components and dialogs
- [x] 🧪 **Testing Setup** - Vitest + Playwright configured
- [x] 📚 **Documentation** - Comprehensive README with architecture details

**Key Achievement**: The backend is feature-complete and ready to power AI agents at the edge. All Cloudflare services (D1, KV, R2, Vectorize, Workers AI) are integrated and working.

---

### ✅ Phase 1: Core Features (95% Complete)

**Goal**: Get agents running on the edge with a polished user experience.

**Complete:**

- [x] 🔐 **Auth System** - Better Auth with email/password (OAuth ready)
- [x] 💬 **Streaming Chat** - SSE-based chat with real-time responses
- [x] 🧠 **Memory & Context** - Conversation history and working memory
- [x] 🛠️ **Tool Library** - 57 pre-built tools across 11 categories:
  - Cloudflare Native: KV, R2, SQL, HTTP, AI Search (17 tools)
  - Utility: datetime, json, text, math, uuid, hash, base64, url, delay (9 tools)
  - AI: sentiment, summarize, translate, image_generate, classify, NER, embedding, Q&A (8 tools)
  - Data: RSS, scrape, regex, crypto, json_schema, csv, template (7 tools)
  - Validation: email, phone, URL, credit card, IP, JSON (6 tools)
  - Transform: markdown, diff, QR code, compression, color (5 tools)
  - Sandbox: code_execute, code_validate, sandbox_file (3 tools)
  - Integrations: Zapier, webhook (2 tools)
- [x] 📊 **Dashboard** - Pages for agents, settings, usage
- [x] ⚙️ **Agent Configuration** - Backend API for full agent CRUD
- [x] 🎮 **Agent Builder UI**
  - [x] Agent list view with status indicators
  - [x] Agent detail page with configuration forms
  - [x] Model selector dropdown
  - [x] Rich instructions editor (CodeMirror)
  - [x] Visual tool picker with drag-and-drop
- [x] 🏥 **Health Monitoring**
  - [x] System health endpoint with service checks (DB, KV, R2, AI)
  - [x] Liveness probe for container orchestration
  - [x] Readiness probe for traffic acceptance
  - [x] Latency thresholds and degraded status detection
- [x] 🐇 **Cloudflare Agents SDK Integration**
  - [x] HareAgent Durable Object with stateful conversations
  - [x] WebSocket support with hibernation
  - [x] Real-time state synchronization
  - [x] Scheduling and alarms (cron + one-time)
  - [x] Tool execution within agent context
- [x] 🔗 **MCP (Model Context Protocol)**
  - [x] HareMcpAgent for external AI clients
  - [x] WebSocket endpoint for Claude Desktop, Cursor, etc.
  - [x] All 57 tools exposed via MCP
  - [x] Workspace resources and context

**Remaining:**

- [x] 🔑 **OAuth Providers** (Complete)
  - [x] Google OAuth integration
  - [x] GitHub OAuth integration
- [x] ✅ **Configuration Validation** (Complete)
  - [x] POST /api/agents/validate endpoint
  - [x] Field-level validation with errors and warnings
  - [x] Configuration preview with resolved defaults
  - [x] Token usage and cost estimation
- [x] 🚀 **One-Click Deployment** (90% complete)
  - [x] Deployment tracking in database
  - [x] Agent serialization and config export
  - [x] Durable Object configuration on deploy
  - [x] Edge endpoint provisioning (URL generation)
  - [x] GET /api/agents/:id/deployment endpoint
  - [x] POST /api/agents/:id/chat HTTP endpoint
  - [ ] Deployment rollback mechanism `medium`

**Difficulty Legend:** `easy` = good for beginners | `medium` = some experience needed | `hard` = complex task

**Next Steps** (Priority order):
1. Add deployment rollback mechanism
2. Embed chat widget for websites

---

### 🏭 Phase 2: Production Ready (40% Complete)

**Goal**: Make Hare production-ready with monitoring, billing, and team features.

**Complete:**

- [x] 📊 **Usage Tracking** - Backend tracking for tokens and requests
- [x] 📈 **Analytics Dashboard** - Charts, visualizations, cost estimates, token usage by agent
- [x] 🚦 **Rate Limiting** - Configurable rate limiters (standard, strict, chat)
- [x] 🛡️ **Security Headers** - CSP, HSTS, XSS protection, CORS

**Planned:**

- [ ] 💳 **Stripe Integration**
  - [ ] Subscription tiers (Free, Pro, Team, Enterprise)
  - [ ] Usage-based billing for overages
  - [ ] Checkout and customer portal
  - [ ] Webhook handlers for events
- [ ] 👥 **Team Collaboration**
  - [ ] Invite team members
  - [ ] Role-based access control (Owner, Admin, Member, Viewer)
  - [ ] Activity logs per workspace
  - [ ] Member management UI
- [ ] 🔍 **Observability**
  - [ ] Request logs with filtering
  - [ ] Error tracking and alerting
  - [ ] Latency monitoring
  - [ ] Agent performance metrics
- [ ] ⚡ **Performance**
  - [ ] Rate limiting by plan tier
  - [ ] Request quotas and throttling
  - [ ] Caching layer (KV) for frequently accessed data
  - [ ] Optimistic UI updates
- [ ] 🎯 **Vector Memory**
  - [ ] Semantic search over conversation history
  - [ ] Long-term memory across sessions
  - [ ] RAG (Retrieval Augmented Generation)
  - [ ] Knowledge base integration

---

### 🚀 Phase 3: Advanced Features (10% Started)

**Goal**: Differentiate Hare with unique capabilities and enterprise features.

**Started:**

- [x] ⏰ **Scheduled Agents** (Backend complete, UI pending)
  - [x] Cron-based execution via Durable Objects
  - [x] One-time scheduled tasks
  - [x] Task state tracking
  - [ ] Trigger configuration UI `medium`
  - [ ] Execution history view `easy`
  - [ ] Failure notifications `medium`

**Planned:**

- [ ] 🔧 **Custom Tool Builder**
  - [ ] Visual HTTP tool configuration (no code)
  - [ ] TypeScript tool templates
  - [ ] Tool testing sandbox
  - [ ] Tool marketplace (share/discover)
- [ ] 🔗 **Multi-Agent Workflows**
  - [ ] Visual workflow designer
  - [ ] Agent chaining and branching
  - [ ] Conditional logic
  - [ ] Parallel execution
- [ ] 📣 **Webhooks & Integrations**
  - [ ] Webhook configuration per agent
  - [ ] Event types (message, error, tool call)
  - [ ] Retry logic with exponential backoff
  - [ ] Integration templates (Slack, Discord, etc.)
- [ ] 💬 **Embed Widget**
  - [ ] Customizable chat widget
  - [ ] One-line installation (`<script>` tag)
  - [ ] Theme customization
  - [ ] Widget analytics
- [ ] 🌐 **Custom Domains**
  - [ ] Bring your own domain
  - [ ] SSL certificate automation
  - [ ] Agent subdomain routing
  - [ ] DNS management

---

### 🏢 Phase 4: Enterprise (Future)

**Goal**: Support large organizations with compliance and advanced requirements.

- [ ] 🔐 **SSO/SAML**
  - [ ] Okta, Auth0, Azure AD integration
  - [ ] Just-in-time provisioning
  - [ ] Group-based access control
- [ ] 📋 **Audit Logs**
  - [ ] Comprehensive activity tracking
  - [ ] Compliance exports (JSON, CSV)
  - [ ] Retention policies
- [ ] 🎯 **SLA & Support**
  - [ ] 99.9% uptime guarantee
  - [ ] Priority support queue
  - [ ] Dedicated Slack channel
  - [ ] Custom onboarding
- [ ] 🏭 **Advanced Deployment**
  - [ ] Private edge locations
  - [ ] VPC integration
  - [ ] Bring your own AI models
  - [ ] On-premise deployment option
- [ ] 📊 **Enterprise Analytics**
  - [ ] Cross-workspace reporting
  - [ ] Cost allocation
  - [ ] Chargeback reports
  - [ ] Custom dashboards

---

### 🏛️ Technical Decisions

Key architecture choices and the reasoning behind them:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Runtime** | Cloudflare Workers | Sub-50ms cold starts, global edge network, native AI bindings |
| **Agents** | Cloudflare Agents SDK | Stateful agents with Durable Objects, WebSocket, scheduling |
| **State** | Durable Objects | Persistent agent state, hibernation, real-time sync |
| **Database** | D1 (SQLite) | Co-located with Workers, zero network latency, familiar SQL |
| **ORM** | Drizzle | Type-safe, SQLite-compatible, excellent DX |
| **API Framework** | Hono | Ultrafast, Workers-native, OpenAPI support, RPC client |
| **Auth** | Better Auth | Open source, self-hosted, TypeScript-first |
| **AI SDK** | Vercel AI SDK | Streaming primitives, tool calling, provider-agnostic |
| **MCP** | Model Context Protocol | Standard for AI client integration (Claude, Cursor) |
| **Frontend** | Vite + TanStack | Fast builds, TanStack Router, excellent Cloudflare Workers support |
| **Styling** | Tailwind + shadcn/ui | Accessible, customizable, consistent design |
| **Monorepo** | Turborepo + Bun | Fast builds, workspace management, native TS |

**Why not X?**

- **Why not Express/Fastify?** Hono is 10x smaller and designed for edge runtimes
- **Why not Prisma?** Drizzle has better SQLite/D1 support and smaller bundle size
- **Why not Clerk/Auth0?** Better Auth is self-hosted (no vendor lock-in) and free
- **Why not tRPC?** Hono RPC provides similar type-safety with OpenAPI compatibility
- **Why not Postgres?** D1 offers zero-latency from Workers; Postgres would add network hops
- **Why Cloudflare Agents SDK?** Native Durable Object integration, WebSocket hibernation, built-in scheduling
- **Why MCP?** Industry standard for AI tool sharing, works with Claude Desktop, Cursor, and more

---

### 🤝 How to Contribute

The roadmap above represents the planned direction, but we welcome community input!

**Quick Start for Contributors:**

1. 🔍 **Find an issue**: Look for `good-first-issue` or `help-wanted` labels
2. 💬 **Comment**: Let us know you're working on it
3. 🍴 **Fork & Clone**: Set up your local environment
4. 🛠️ **Build**: Follow the [Quick Start](#quick-start) guide
5. ✅ **Test**: Run `bun run test && bun run check`
6. 🚀 **Submit PR**: We review PRs quickly!

**High-Impact Areas for Contributors:**

| Area | Examples | Difficulty |
|------|----------|------------|
| 🎨 **UI/UX** | Agent builder polish, dashboard improvements | `easy` to `medium` |
| 🧪 **Testing** | E2E tests, API tests, edge cases | `easy` to `medium` |
| 📚 **Docs** | Tutorials, guides, API examples | `easy` |
| 🛠️ **Tools** | GitHub, Linear, Notion integrations | `medium` |
| 🔌 **Integrations** | OAuth providers, webhooks | `medium` to `hard` |
| 🌍 **i18n** | Internationalization support | `medium` |

**Looking for `good-first-issue`?** Check these items in Phase 1:
- Configuration validation and preview
- Health checks and monitoring

**See [Contributing](#contributing) section for full setup instructions.**

---

### 📊 Success Metrics

We're tracking these metrics to measure progress:

- **Time to First Agent**: < 5 minutes from signup to deployed agent
- **Cold Start Latency**: < 50ms average globally
- **API Uptime**: > 99.9% across all edge locations
- **Test Coverage**: > 80% for core features
- **Documentation**: 100% of API endpoints documented
- **Community**: Growing contributor base and active discussions

---

### 💡 Future Ideas (Not Yet Prioritized)

Ideas we're considering but haven't scheduled:

**AI & Agents:**
- Voice agent support (Speech-to-Text + TTS via Workers AI)
- Multi-modal support (images, PDFs, videos)
- Fine-tuning support for custom models
- Agent templates library (customer support, sales, etc.)
- A/B testing for agent variations
- Agent analytics (user satisfaction, conversation quality)

**Platform:**
- Agent marketplace (discover and clone agents)
- Tool marketplace via MCP
- Mobile app for agent management
- Integration with additional vector databases (Pinecone, Weaviate)
- Bring your own LLM (OpenAI, Anthropic, etc.)

**MCP Ecosystem:**
- MCP prompts and prompt templates
- MCP resource subscriptions
- Cross-workspace tool sharing

Have ideas? [Open an issue](https://github.com/andrew-bierman/hare/issues) to discuss! 💚

---

## Contributing

We welcome contributions! Whether you're fixing a bug, adding a feature, or improving documentation, we'd love your help making Hare even faster! 🐇💨

### 🛠️ Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**: 
   ```bash
   git clone https://github.com/yourusername/hare.git
   cd hare
   ```
3. **Install dependencies**: 
   ```bash
   bun install
   ```
4. **Create a feature branch**: 
   ```bash
   git checkout -b feature/your-amazing-feature
   ```
5. **Make your changes** (write tests if applicable!)
6. **Run tests and checks**: 
   ```bash
   bun run test
   bun run check
   bun run typecheck
   ```
7. **Commit with gitmoji**: 
   ```bash
   git commit -m "✨ Add your amazing feature"
   ```
8. **Push and create a pull request**:
   ```bash
   git push origin feature/your-amazing-feature
   ```

### 📝 Commit Convention

We use [gitmoji](https://gitmoji.dev/) for commit messages to make the git history more fun and readable:

- ✨ `:sparkles:` - New feature
- 🐛 `:bug:` - Bug fix
- 📝 `:memo:` - Documentation
- ♻️ `:recycle:` - Refactoring
- ⚡ `:zap:` - Performance improvements
- ✅ `:white_check_mark:` - Tests
- 🎨 `:art:` - UI/UX improvements
- 🔧 `:wrench:` - Configuration changes
- 🚀 `:rocket:` - Deployment related

### 🎯 Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Write clear PR descriptions
- Add tests for new features
- Update documentation if needed
- Ensure all CI checks pass
- Be patient and kind in code reviews! 💚

---

## FAQ

### 🤔 Why "Hare" and not "Rabbit"?

Because hares are **faster** than rabbits! They can reach speeds of 45 mph (72 km/h), making them one of the fastest land animals. Just like how Hare makes AI agents run faster than traditional platforms. Also, "hare" sounds cooler. 😎

### 🚀 Is Hare actually faster than other platforms?

Yes! Thanks to Cloudflare Workers' sub-50ms cold starts (vs 500ms+ on AWS Lambda) and global edge distribution, your agents respond in milliseconds, not seconds. Plus, all data is co-located on the edge—no cross-region database calls.

### 💰 How much does Cloudflare cost?

Cloudflare's free tier is **very generous**:
- Workers: 100,000 requests/day free
- D1: 5GB storage, 5 million reads/day free
- R2: 10GB storage, 1 million requests/month free
- Workers AI: Pay-as-you-go pricing

For most development and small production workloads, you'll stay within the free tier!

### 🛠️ Can I self-host Hare?

Yes! Hare is open source (MIT License). You can deploy it to your own Cloudflare account or even adapt it to run on other platforms (though you'll lose some Cloudflare-specific features).

### 🤝 How can I contribute?

We'd love your help! Check out the [Contributing](#contributing) section above for guidelines. Whether it's code, documentation, or bug reports—all contributions are welcome! 💚

### 🐛 Found a bug?

Please [open an issue](https://github.com/andrew-bierman/hare/issues) on GitHub with:
- A clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Bun version, etc.)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

**Built with 💚 by [Andrew Bierman](https://github.com/andrew-bierman) and contributors**

---

## Acknowledgments

**Powered by amazing open source projects:**

- ⚡ [Vite](https://vitejs.dev/) - Next generation frontend tooling
- 🛤️ [TanStack Router](https://tanstack.com/router) - Type-safe routing for React
- ☁️ [Cloudflare Workers](https://workers.cloudflare.com/) - Lightning-fast edge compute
- 🤖 [Workers AI](https://developers.cloudflare.com/workers-ai/) - AI inference at the edge
- ⚡ [Vercel AI SDK](https://sdk.vercel.ai/) - Unified AI streaming interface
- 💾 [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM for SQL databases
- 🔐 [Better Auth](https://www.better-auth.com/) - Modern authentication for TypeScript
- 🎨 [shadcn/ui](https://ui.shadcn.com/) - Beautifully designed components
- 🔌 [Hono](https://hono.dev/) - Ultrafast web framework for the edge
- 🐇 [Bun](https://bun.sh/) - Fast all-in-one JavaScript runtime

---

**🐇 Fast. Simple. Powerful. That's Hare.**

For AI coding guidelines, see [CLAUDE.md](CLAUDE.md).
