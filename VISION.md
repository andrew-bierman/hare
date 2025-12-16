# Hare SaaS — Product Vision & Technical Specification

> **One-liner:** Build and deploy AI agents to the edge in minutes, no infrastructure required.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Target Market](#target-market)
3. [Value Proposition](#value-proposition)
4. [Core Features](#core-features)
5. [User Flows](#user-flows)
6. [Technical Architecture](#technical-architecture)
7. [Database Schema](#database-schema)
8. [API Design](#api-design)
9. [Agent Runtime](#agent-runtime)
10. [Monetization](#monetization)
11. [Competitive Analysis](#competitive-analysis)
12. [Implementation Roadmap](#implementation-roadmap)
13. [Success Metrics](#success-metrics)

---

## Executive Summary

Hare is a Cloudflare-native platform for building, deploying, and managing AI agents at the edge. Unlike traditional agent platforms that rely on centralized cloud infrastructure, Hare leverages Cloudflare's global network to deliver sub-50ms response times from 300+ cities worldwide.

**The Problem:**
- Building AI agents requires deep infrastructure knowledge
- Traditional serverless has slow cold starts (500ms+ on Lambda)
- Managing agent state, memory, and tools is complex
- Most solutions are either too enterprise-heavy or require self-hosting

**The Solution:**
Hare provides a visual builder for AI agents that deploy instantly to Cloudflare Workers, with built-in memory (D1/Vectorize), tool libraries, and observability—all without touching infrastructure.

---

## Target Market

### Primary Segments

| Segment | Description | Pain Points | Hare Solution |
|---------|-------------|-------------|---------------|
| **Startups** | Early-stage companies adding AI features | No AI engineers, budget constraints | Visual builder, generous free tier |
| **Agencies** | Building agents for multiple clients | Managing many deployments, white-labeling | Workspaces, custom domains |
| **Product Teams** | Adding AI to existing products | Speed of iteration, integration complexity | API-first, instant deploys |
| **Enterprise** | Giving business users agent power | Governance, security, compliance | SSO, audit logs, role-based access |

### User Personas

**1. The Startup Founder (Primary)**
- Technical enough to understand APIs
- Needs to ship AI features fast
- Budget-conscious, values predictable pricing
- Wants to avoid vendor lock-in

**2. The Agency Developer**
- Building agents for clients
- Needs multi-tenant support
- Values white-labeling and custom domains
- Requires easy handoff to clients

**3. The Product Manager**
- Non-technical but tech-savvy
- Needs to prototype agent ideas quickly
- Values playground for testing
- Wants visibility into usage/costs

**4. The Enterprise IT Lead**
- Security and compliance focused
- Needs SSO, audit trails
- Requires SLAs and dedicated support
- Values predictable, enterprise-grade pricing

---

## Value Proposition

### Why Cloudflare-Native Matters

| Benefit | Traditional Cloud | Hare (Cloudflare) |
|---------|-------------------|-------------------|
| **Cold Start** | 500ms+ (Lambda) | <50ms |
| **Global Latency** | Single region | 300+ cities |
| **Database** | External (Postgres, etc.) | D1 (co-located) |
| **Vector Store** | Pinecone, Weaviate | Vectorize (native) |
| **File Storage** | S3 | R2 (zero egress) |
| **Cache** | Redis/ElastiCache | KV (global) |
| **Pricing** | Unpredictable | Predictable |

### Core Differentiators

1. **Instant Global Deploy**: Agents run in 300+ cities, not a single region
2. **Zero External Dependencies**: D1, KV, R2, Vectorize all native
3. **Mastra-Powered**: Production-grade agent framework under the hood
4. **Simple UX**: Visual builder accessible to non-engineers
5. **Developer-First API**: Full control via REST/OpenAPI when needed

---

## Core Features

### MVP Features (v1.0)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Agent Builder** | Visual UI to configure model, instructions, tools | P0 |
| **Model Selector** | Workers AI models (Llama, Mistral, etc.) | P0 |
| **Instructions Editor** | Markdown/rich text for system prompts | P0 |
| **Tool Library** | Pre-built tools (HTTP, SQL, Search) | P0 |
| **Chat Playground** | Test agents in-browser with streaming | P0 |
| **One-Click Deploy** | Deploy to Cloudflare Workers instantly | P0 |
| **API Endpoint** | REST API for agent invocation | P0 |
| **Basic Observability** | Logs, token usage, latency | P0 |
| **Workspaces** | Organize agents by project/client | P0 |
| **User Auth** | Sign up, sign in, password reset | P0 |

### Post-MVP Features (v1.x)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Embed Widget** | Drop-in chat widget for websites | P1 |
| **Custom Tools** | Build tools with code or HTTP config | P1 |
| **Agent Memory** | Conversation history with Vectorize | P1 |
| **Team Collaboration** | Invite teammates, role-based access | P1 |
| **Versioning** | Roll back to previous agent versions | P1 |
| **Custom Domains** | agents.yourcompany.com | P1 |
| **Webhooks** | Event notifications for agent activity | P2 |
| **Scheduled Agents** | Run agents on a cron schedule | P2 |
| **Multi-Agent Workflows** | Chain agents together | P2 |
| **Fine-tuning** | Custom model training | P3 |

### Enterprise Features (v2.0)

| Feature | Description |
|---------|-------------|
| **SSO/SAML** | Enterprise identity providers |
| **Audit Logs** | Complete activity trail |
| **SLA** | 99.9% uptime guarantee |
| **Dedicated Support** | Slack channel, SLA on response |
| **Data Residency** | Choose Cloudflare regions |
| **Private Deployment** | On-premise option |

---

## User Flows

### Flow 1: First-Time User Onboarding

```
1. Landing Page
   └─> Click "Get Started Free"

2. Sign Up (Better Auth)
   ├─> Email/Password
   ├─> Google OAuth
   └─> GitHub OAuth

3. Create Workspace
   └─> Name your workspace (e.g., "My Startup")

4. Create First Agent
   ├─> Choose template OR start blank
   ├─> Name: "Customer Support Bot"
   ├─> Model: llama-3.1-70b-instruct
   └─> Instructions: "You are a helpful..."

5. Test in Playground
   ├─> Type test message
   ├─> See streaming response
   └─> Iterate on instructions

6. Deploy
   ├─> Click "Deploy"
   ├─> Get API endpoint
   ├─> Copy embed code
   └─> View in production
```

### Flow 2: Agent Building (Detailed)

```
Agent Builder UI
├── Header
│   ├── Agent Name (editable)
│   ├── Status: Draft | Deployed
│   ├── [Test] [Deploy] [Settings]
│   └── Last saved: 2 min ago
│
├── Left Panel: Configuration
│   ├── Model Selection
│   │   ├── Workers AI (free tier)
│   │   │   ├── llama-3.1-70b-instruct
│   │   │   ├── llama-3.1-8b-instruct
│   │   │   └── mistral-7b-instruct
│   │   └── External (bring your key)
│   │       ├── OpenAI GPT-4
│   │       ├── Anthropic Claude
│   │       └── Custom endpoint
│   │
│   ├── Instructions
│   │   ├── System Prompt (markdown)
│   │   ├── Variables: {{user_name}}, {{company}}
│   │   └── Examples (few-shot)
│   │
│   ├── Tools
│   │   ├── Enabled Tools
│   │   │   ├── [x] HTTP Request
│   │   │   ├── [x] Search Web
│   │   │   └── [ ] SQL Query
│   │   └── [+ Add Custom Tool]
│   │
│   ├── Memory
│   │   ├── [ ] Enable conversation memory
│   │   ├── Retention: 7 days
│   │   └── Max messages: 100
│   │
│   └── Advanced
│       ├── Temperature: 0.7
│       ├── Max tokens: 4096
│       └── Stop sequences
│
├── Center Panel: Playground
│   ├── Chat Interface
│   │   ├── Message history
│   │   ├── Streaming response
│   │   └── Tool call visualization
│   └── Input
│       ├── Message input
│       ├── [Send]
│       └── [Clear conversation]
│
└── Right Panel: Insights
    ├── Token Usage
    │   ├── Input: 150 tokens
    │   └── Output: 89 tokens
    ├── Latency: 234ms
    ├── Tools Called: HTTP (1)
    └── [View Full Trace]
```

### Flow 3: Deployment & Integration

```
After clicking "Deploy":

1. Deployment Progress
   ├── Building agent bundle...
   ├── Uploading to Cloudflare...
   ├── Propagating to 300+ cities...
   └── ✓ Live!

2. Integration Options
   ├── API Endpoint
   │   └── POST https://api.hare.run/v1/agents/{id}/chat
   │
   ├── cURL Example
   │   └── curl -X POST ... -d '{"message": "Hello"}'
   │
   ├── SDK (coming soon)
   │   ├── npm install @hare/sdk
   │   └── import { Hare } from '@hare/sdk'
   │
   └── Embed Widget
       └── <script src="https://embed.hare.run/widget.js" 
            data-agent-id="{id}"></script>

3. Environment Options
   ├── Production (default)
   ├── Staging
   └── Development (local)
```

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         HARE PLATFORM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   APPS       │    │   PACKAGES   │    │   SERVICES   │      │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤      │
│  │              │    │              │    │              │      │
│  │  apps/web    │───▶│  packages/   │◀───│  Cloudflare  │      │
│  │  (Next.js)   │    │  db          │    │  Workers     │      │
│  │              │    │  (Drizzle)   │    │              │      │
│  │  Dashboard   │    │              │    │  D1          │      │
│  │  Playground  │    │  packages/   │    │  KV          │      │
│  │  Settings    │    │  core        │    │  R2          │      │
│  │              │    │  (Types)     │    │  Vectorize   │      │
│  ├──────────────┤    │              │    │              │      │
│  │              │    │  packages/   │    │  Workers AI  │      │
│  │  apps/api    │───▶│  ui          │    │              │      │
│  │  (Hono)      │    │  (shadcn)    │    └──────────────┘      │
│  │              │    │              │                          │
│  │  REST API    │    │  packages/   │                          │
│  │  Webhooks    │    │  auth        │                          │
│  │  Billing     │    │  (Better     │                          │
│  │              │    │   Auth)      │                          │
│  ├──────────────┤    │              │                          │
│  │              │    └──────────────┘                          │
│  │  apps/       │                                              │
│  │  runtime     │──────────────────────────────────────────────┤
│  │  (Mastra)    │                                              │
│  │              │    Agent Execution on Cloudflare Workers     │
│  │  Agent Exec  │    ┌────────────────────────────────────┐   │
│  │  Streaming   │    │  User Request                      │   │
│  │  Tool Calls  │    │       │                            │   │
│  │              │    │       ▼                            │   │
│  └──────────────┘    │  ┌─────────┐    ┌─────────┐        │   │
│                      │  │ Mastra  │───▶│ Workers │        │   │
│                      │  │ Agent   │    │ AI      │        │   │
│                      │  └─────────┘    └─────────┘        │   │
│                      │       │                            │   │
│                      │       ▼                            │   │
│                      │  ┌─────────┐    ┌─────────┐        │   │
│                      │  │ Memory  │───▶│ D1/     │        │   │
│                      │  │ Layer   │    │ Vector  │        │   │
│                      │  └─────────┘    └─────────┘        │   │
│                      │       │                            │   │
│                      │       ▼                            │   │
│                      │  Streaming Response                │   │
│                      └────────────────────────────────────┘   │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
hare/
├── apps/
│   ├── web/                      # Next.js Dashboard
│   │   ├── app/                  # App Router
│   │   │   ├── (auth)/           # Auth pages (sign-in, sign-up)
│   │   │   ├── (dashboard)/      # Protected dashboard
│   │   │   │   ├── agents/       # Agent list, builder
│   │   │   │   ├── playground/   # Test agents
│   │   │   │   ├── settings/     # Workspace settings
│   │   │   │   └── billing/      # Subscription management
│   │   │   ├── (marketing)/      # Landing page, docs
│   │   │   └── api/              # Next.js API routes (auth callbacks)
│   │   ├── components/           # Page-specific components
│   │   ├── lib/                  # Utilities, hooks
│   │   ├── next.config.ts        # Next.js config (Cloudflare)
│   │   └── wrangler.toml         # Cloudflare Pages config
│   │
│   ├── api/                      # Hono API (Cloudflare Workers)
│   │   ├── src/
│   │   │   ├── index.ts          # Hono app entry
│   │   │   ├── routes/
│   │   │   │   ├── agents.ts     # CRUD for agents
│   │   │   │   ├── chat.ts       # Chat endpoint
│   │   │   │   ├── tools.ts      # Tool management
���   │   │   │   ├── workspaces.ts # Workspace management
│   │   │   │   └── webhooks.ts   # Stripe, etc.
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts       # Auth middleware
│   │   │   │   ├── rateLimit.ts  # Rate limiting
│   │   │   │   └── cors.ts       # CORS handling
│   │   │   ├── lib/
│   │   │   │   ├── db.ts         # D1 connection
│   │   │   │   ├── kv.ts         # KV helpers
│   │   │   │   └── billing.ts    # Stripe helpers
│   │   │   └── openapi.ts        # OpenAPI spec (Scalar)
│   │   ├── wrangler.toml         # Worker config
│   │   └── package.json
│   │
│   └── runtime/                  # Agent Runtime (Cloudflare Workers)
│       ├── src/
│       │   ├── index.ts          # Worker entry
│       │   ├── agent.ts          # Mastra agent factory
│       │   ├── memory.ts         # Memory management
│       │   ├── tools/
│       │   │   ├── http.ts       # HTTP request tool
│       │   │   ├── search.ts     # Web search tool
│       │   │   ├── sql.ts        # D1 query tool
│       │   │   └── custom.ts     # Custom tool executor
│       │   └── streaming.ts      # SSE streaming
│       ├── wrangler.toml
│       └── package.json
│
├── packages/
│   ├── db/                       # Database (Drizzle + D1)
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── users.ts
│   │   │   │   ├── workspaces.ts
│   │   │   │   ├── agents.ts
│   │   │   │   ├── tools.ts
│   │   │   │   ├── conversations.ts
│   │   │   │   ├── messages.ts
│   │   │   │   ├── deployments.ts
│   │   │   │   └── usage.ts
│   │   │   ├── index.ts          # Schema exports
│   │   │   └── client.ts         # DB client factory
│   │   ├── migrations/           # SQL migrations
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── core/                     # Shared Types & Utils
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── agent.ts
│   │   │   │   ├── tool.ts
│   │   │   │   ├── message.ts
│   │   │   │   └── api.ts
│   │   │   ├── schemas/          # Zod schemas
│   │   │   │   ├── agent.ts
│   │   │   │   └── tool.ts
│   │   │   ├── utils/
│   │   │   │   ├── id.ts         # ID generation
│   │   │   │   └── errors.ts     # Error handling
│   │   │   └── constants.ts
│   │   └── package.json
│   │
│   ├── ui/                       # Shared UI (shadcn)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/           # shadcn primitives
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── input.tsx
│   │   │   │   │   ├── dialog.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── agent/        # Agent-specific components
│   │   │   │   │   ├── agent-card.tsx
│   │   │   │   │   ├── model-selector.tsx
│   │   │   │   │   └── tool-picker.tsx
│   │   │   │   └── chat/         # Chat components
│   │   │   │       ├── message-bubble.tsx
│   │   │   │       ├── chat-input.tsx
│   │   │   │       └── streaming-text.tsx
│   │   │   └── lib/
│   │   │       └── utils.ts      # cn(), etc.
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── auth/                     # Authentication (Better Auth)
│       ├── src/
│       │   ├── server.ts         # Server-side auth
│       │   ├── client.ts         # Client-side auth
│       │   ├── middleware.ts     # Auth middleware
│       │   └── config.ts         # Auth configuration
│       └── package.json
│
├── tooling/                      # Build & Dev Tools
│   ├── eslint/                   # ESLint configs
│   ├── typescript/               # TSConfig bases
│   └── tailwind/                 # Tailwind presets
│
├── .env.example                  # Environment template
├── package.json                  # Root package.json
├── bun.lockb                     # Bun lockfile
├── turbo.json                    # Turborepo config (optional)
└── CLAUDE.md                     # AI coding guidelines
```

### Tech Stack Details

| Layer | Technology | Why |
|-------|------------|-----|
| **Monorepo** | Bun Workspaces | Fast, native TypeScript, no build step |
| **Frontend** | Next.js 15 + React 19 | App Router, RSC, Cloudflare Pages |
| **UI** | shadcn/ui + Tailwind | Accessible, customizable, copy-paste |
| **Backend** | Hono | Lightweight, Workers-native, OpenAPI |
| **Database** | D1 + Drizzle | Edge SQL, type-safe ORM |
| **Cache** | Cloudflare KV | Global key-value, session storage |
| **Storage** | Cloudflare R2 | S3-compatible, zero egress |
| **Vectors** | Cloudflare Vectorize | Native embeddings storage |
| **AI Models** | Workers AI | Llama, Mistral, embeddings |
| **Agents** | Mastra | Production agent framework |
| **Auth** | Better Auth | Open source, self-hosted |
| **Payments** | Stripe | Subscriptions, usage billing |
| **Docs** | Scalar | OpenAPI documentation |

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
   │ agent_id    │  │ agent_id    │  │ agent_id    │
   │ version     │  │ session_id  │  │ tokens_in   │
   │ config_hash │  │ metadata    │  │ tokens_out  │
   │ status      │  │ created_at  │  │ latency_ms  │
   │ created_at  │  │             │  │ created_at  │
   └─────────────┘  └─────────────┘  └─────────────┘
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

### Schema Definitions (Drizzle)

```typescript
// packages/db/src/schema/users.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
});

// packages/db/src/schema/workspaces.ts
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan', { enum: ['free', 'pro', 'team', 'enterprise'] }).default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
});

export const workspaceMembers = sqliteTable('workspace_members', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'admin', 'member', 'viewer'] }).default('member'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// packages/db/src/schema/agents.ts
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  model: text('model').notNull().default('llama-3.1-70b-instruct'),
  instructions: text('instructions').notNull(),
  config: text('config', { mode: 'json' }).$type<AgentConfig>(),
  status: text('status', { enum: ['draft', 'deployed', 'archived'] }).default('draft'),
  deployedAt: integer('deployed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
});

// packages/db/src/schema/tools.ts
export const tools = sqliteTable('tools', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', { enum: ['http', 'sql', 'search', 'custom'] }).notNull(),
  config: text('config', { mode: 'json' }).$type<ToolConfig>(),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
});

export const agentTools = sqliteTable('agent_tools', {
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  toolId: text('tool_id').notNull().references(() => tools.id, { onDelete: 'cascade' }),
  config: text('config', { mode: 'json' }),  // Tool-specific overrides
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.toolId] }),
}));

// packages/db/src/schema/conversations.ts
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(),  // External session identifier
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system', 'tool'] }).notNull(),
  content: text('content').notNull(),
  toolCalls: text('tool_calls', { mode: 'json' }),
  toolResults: text('tool_results', { mode: 'json' }),
  tokensIn: integer('tokens_in'),
  tokensOut: integer('tokens_out'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// packages/db/src/schema/deployments.ts
export const deployments = sqliteTable('deployments', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  configHash: text('config_hash').notNull(),  // Hash of agent config for diffing
  status: text('status', { enum: ['pending', 'active', 'rolled_back', 'failed'] }).default('pending'),
  deployedBy: text('deployed_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// packages/db/src/schema/usage.ts
export const usage = sqliteTable('usage', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  messageId: text('message_id').references(() => messages.id, { onDelete: 'set null' }),
  tokensIn: integer('tokens_in').notNull().default(0),
  tokensOut: integer('tokens_out').notNull().default(0),
  latencyMs: integer('latency_ms'),
  model: text('model'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

---

## API Design

### OpenAPI Specification (Hono + Scalar)

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

const app = new OpenAPIHono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', secureHeaders());

// OpenAPI docs at /docs
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Hare API',
    version: '1.0.0',
    description: 'Build and deploy AI agents to the edge',
  },
  servers: [
    { url: 'https://api.hare.run', description: 'Production' },
    { url: 'http://localhost:8787', description: 'Development' },
  ],
});

app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export default app;
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Auth** |||
| POST | `/auth/signup` | Create account |
| POST | `/auth/signin` | Sign in |
| POST | `/auth/signout` | Sign out |
| GET | `/auth/session` | Get current session |
| **Workspaces** |||
| GET | `/workspaces` | List user's workspaces |
| POST | `/workspaces` | Create workspace |
| GET | `/workspaces/:id` | Get workspace |
| PATCH | `/workspaces/:id` | Update workspace |
| DELETE | `/workspaces/:id` | Delete workspace |
| **Agents** |||
| GET | `/workspaces/:wid/agents` | List agents |
| POST | `/workspaces/:wid/agents` | Create agent |
| GET | `/agents/:id` | Get agent |
| PATCH | `/agents/:id` | Update agent |
| DELETE | `/agents/:id` | Delete agent |
| POST | `/agents/:id/deploy` | Deploy agent |
| POST | `/agents/:id/rollback` | Rollback deployment |
| **Chat** |||
| POST | `/agents/:id/chat` | Send message (streaming) |
| GET | `/agents/:id/conversations` | List conversations |
| GET | `/conversations/:id/messages` | Get messages |
| **Tools** |||
| GET | `/workspaces/:wid/tools` | List tools |
| POST | `/workspaces/:wid/tools` | Create custom tool |
| GET | `/tools/:id` | Get tool |
| PATCH | `/tools/:id` | Update tool |
| DELETE | `/tools/:id` | Delete tool |
| **Usage** |||
| GET | `/workspaces/:wid/usage` | Get usage stats |
| GET | `/agents/:id/usage` | Get agent usage |

### Request/Response Examples

```typescript
// POST /workspaces/:wid/agents
// Request
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

// Response (201 Created)
{
  "id": "agent_xyz789",
  "workspaceId": "ws_abc123",
  "name": "Customer Support",
  "description": "Handles customer inquiries",
  "model": "llama-3.1-70b-instruct",
  "instructions": "You are a helpful customer support agent for Acme Corp...",
  "config": { ... },
  "status": "draft",
  "tools": [
    { "id": "tool_abc123", "name": "HTTP Request", "type": "http" },
    { "id": "tool_def456", "name": "Search Web", "type": "search" }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

```typescript
// POST /agents/:id/chat
// Request
{
  "message": "How do I reset my password?",
  "sessionId": "session_user123",  // Optional, for conversation continuity
  "metadata": {                     // Optional, passed to agent
    "userId": "user_abc",
    "plan": "pro"
  }
}

// Response (SSE stream)
event: message
data: {"type": "text", "content": "I"}

event: message
data: {"type": "text", "content": "'d be happy"}

event: message
data: {"type": "text", "content": " to help you reset your password!"}

event: tool_call
data: {"type": "tool_call", "tool": "search_kb", "input": {"query": "password reset"}}

event: tool_result
data: {"type": "tool_result", "tool": "search_kb", "output": {"results": [...]}}

event: message
data: {"type": "text", "content": "\n\nHere's how to reset your password:\n1. Go to..."}

event: done
data: {"type": "done", "usage": {"tokensIn": 150, "tokensOut": 89, "latencyMs": 234}}
```

---

## Agent Runtime

### Mastra Integration

```typescript
// apps/runtime/src/agent.ts
import { Agent } from '@mastra/core';
import { createTool } from '@mastra/core';

interface AgentConfig {
  id: string;
  name: string;
  model: string;
  instructions: string;
  tools: ToolConfig[];
  memory: MemoryConfig;
}

export function createAgentFromConfig(config: AgentConfig, env: Env): Agent {
  // Build tools from config
  const tools = config.tools.map(toolConfig => createToolFromConfig(toolConfig, env));
  
  // Create Mastra agent
  return new Agent({
    name: config.name,
    instructions: config.instructions,
    model: getModel(config.model, env),
    tools,
    memory: config.memory.enabled ? createMemory(config.memory, env) : undefined,
  });
}

function getModel(modelId: string, env: Env) {
  // Workers AI models
  const workersAiModels: Record<string, string> = {
    'llama-3.1-70b-instruct': '@cf/meta/llama-3.1-70b-instruct',
    'llama-3.1-8b-instruct': '@cf/meta/llama-3.1-8b-instruct',
    'mistral-7b-instruct': '@cf/mistral/mistral-7b-instruct-v0.2',
  };
  
  if (workersAiModels[modelId]) {
    return {
      provider: 'workers-ai',
      name: workersAiModels[modelId],
      binding: env.AI,
    };
  }
  
  // External models (user provides API key)
  throw new Error(`Unknown model: ${modelId}`);
}
```

### Tool Execution

```typescript
// apps/runtime/src/tools/http.ts
import { createTool } from '@mastra/core';
import { z } from 'zod';

export const httpTool = createTool({
  id: 'http_request',
  name: 'HTTP Request',
  description: 'Make HTTP requests to external APIs',
  inputSchema: z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
  }),
  execute: async ({ method, url, headers, body }) => {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    return {
      status: response.status,
      data,
    };
  },
});
```

### Memory with Vectorize

```typescript
// apps/runtime/src/memory.ts
import { VectorMemory } from '@mastra/memory';

interface MemoryConfig {
  enabled: boolean;
  maxMessages: number;
  retentionDays: number;
}

export function createMemory(config: MemoryConfig, env: Env): VectorMemory {
  return new VectorMemory({
    vectorIndex: env.VECTORIZE,
    storage: env.D1,
    embeddingModel: env.AI,
    maxMessages: config.maxMessages,
    retentionDays: config.retentionDays,
  });
}
```

### Streaming Response

```typescript
// apps/runtime/src/index.ts
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createAgentFromConfig } from './agent';

const app = new Hono<{ Bindings: Env }>();

app.post('/agents/:id/chat', async (c) => {
  const agentId = c.req.param('id');
  const { message, sessionId, metadata } = await c.req.json();
  
  // Load agent config from D1
  const agentConfig = await loadAgentConfig(agentId, c.env.D1);
  if (!agentConfig) {
    return c.json({ error: 'Agent not found' }, 404);
  }
  
  // Create agent instance
  const agent = createAgentFromConfig(agentConfig, c.env);
  
  // Stream response
  return streamSSE(c, async (stream) => {
    const startTime = Date.now();
    let tokensIn = 0;
    let tokensOut = 0;
    
    await agent.stream(message, {
      sessionId,
      metadata,
      onToken: async (token) => {
        tokensOut++;
        await stream.writeSSE({
          event: 'message',
          data: JSON.stringify({ type: 'text', content: token }),
        });
      },
      onToolCall: async (toolCall) => {
        await stream.writeSSE({
          event: 'tool_call',
          data: JSON.stringify({ type: 'tool_call', ...toolCall }),
        });
      },
      onToolResult: async (toolResult) => {
        await stream.writeSSE({
          event: 'tool_result',
          data: JSON.stringify({ type: 'tool_result', ...toolResult }),
        });
      },
    });
    
    // Send final event with usage
    await stream.writeSSE({
      event: 'done',
      data: JSON.stringify({
        type: 'done',
        usage: {
          tokensIn,
          tokensOut,
          latencyMs: Date.now() - startTime,
        },
      }),
    });
  });
});

export default app;
```

---

## Monetization

### Pricing Tiers

| Tier | Price | Agents | Messages/mo | Features |
|------|-------|--------|-------------|----------|
| **Free** | $0 | 3 | 1,000 | Playground, Community support |
| **Pro** | $29/mo | 20 | 50,000 | Custom domains, Priority support |
| **Team** | $99/mo | Unlimited | 500,000 | Team seats, API priority, Analytics |
| **Enterprise** | Custom | Unlimited | Custom | SSO, Audit logs, SLA, Dedicated support |

### Usage-Based Pricing

| Resource | Free Included | Overage |
|----------|---------------|---------|
| Messages | Tier limit | $0.002/message |
| Tokens (Workers AI) | Pass-through | Cost + 20% margin |
| Tokens (External) | N/A | Pass-through only |
| Storage (R2) | 1GB | $0.015/GB/mo |
| Vector Storage | 10k vectors | $0.01/1k vectors |

### Stripe Integration

```typescript
// apps/api/src/routes/webhooks.ts
import { Hono } from 'hono';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

app.post('/webhooks/stripe', async (c) => {
  const sig = c.req.header('stripe-signature')!;
  const body = await c.req.text();
  
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }
  
  return c.json({ received: true });
});
```

---

## Competitive Analysis

### Landscape Overview

```
                    Developer-Focused
                          ↑
                          │
           Mastra ●       │       ● LangChain
                          │
     Hare ●───────────────┼───────────────● Relevance AI
                          │
                          │
        Voiceflow ●       │       ● Botpress
                          │
                          ↓
                    Business-User-Focused

← Self-Hosted                    Fully Managed →
```

### Detailed Comparison

| Feature | Hare | Voiceflow | Botpress | Relevance AI | Langbase |
|---------|------|-----------|----------|--------------|----------|
| **Target** | Developers + PMs | Enterprise | Open source | No-code | Developers |
| **Edge Deploy** | ✓ Cloudflare | ✗ AWS | ✗ Self-host | ✗ GCP | ✗ AWS |
| **Cold Start** | <50ms | 500ms+ | N/A | 200ms+ | 300ms+ |
| **Agent Framework** | Mastra | Proprietary | Proprietary | Proprietary | LangChain |
| **Visual Builder** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Custom Tools** | ✓ | ✓ | ✓ | Limited | ✓ |
| **Vector Memory** | Native | External | External | Native | External |
| **Pricing** | Simple | Complex | Free + Enterprise | Usage | Usage |
| **Self-Host** | ✗ | ✗ | ✓ | ✗ | ✗ |

### Hare's Unique Position

1. **Cloudflare-Native**: Only platform built entirely on Cloudflare's edge
2. **Mastra-Powered**: Production-grade agent framework vs proprietary solutions
3. **Simple Pricing**: Transparent tiers vs complex usage calculations
4. **Developer + PM Friendly**: Visual builder AND full API access
5. **Instant Global**: 300+ cities, not single-region deployment

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

```
Week 1: Monorepo & Auth
├── [ ] Set up Bun workspaces monorepo structure
├── [ ] Configure TypeScript, ESLint, Prettier
├── [ ] Set up apps/web (Next.js 15 + Cloudflare)
├── [ ] Set up apps/api (Hono + OpenAPI)
├── [ ] Set up packages/db (Drizzle + D1)
├── [ ] Set up packages/core (Types, Zod schemas)
├── [ ] Set up packages/ui (shadcn/ui)
├── [ ] Implement Better Auth (signup, signin, session)
└── [ ] Deploy to Cloudflare (Pages + Workers)

Week 2: Database & Core API
├── [ ] Create D1 database and migrations
├── [ ] Implement all Drizzle schemas
├── [ ] Build workspace CRUD API
├── [ ] Build agent CRUD API
├── [ ] Build tool CRUD API
├── [ ] Add auth middleware to API
├── [ ] Set up OpenAPI docs with Scalar
└── [ ] Basic error handling and validation
```

### Phase 2: Agent Builder (Weeks 3-4)

```
Week 3: Builder UI
├── [ ] Dashboard layout (sidebar, header)
├── [ ] Workspace switcher
├── [ ] Agent list page (cards, search, filters)
├── [ ] Agent builder page (form, tabs)
├── [ ] Model selector component
├── [ ] Instructions editor (markdown)
├── [ ] Tool picker component
├── [ ] Agent settings panel
└── [ ] Save/publish flow

Week 4: Advanced Builder
├── [ ] Tool library browser
├── [ ] HTTP tool configuration UI
├── [ ] Custom tool builder
├── [ ] Memory configuration
├── [ ] Advanced settings (temperature, tokens)
├── [ ] Agent versioning UI
├── [ ] Duplicate agent
└── [ ] Delete agent with confirmation
```

### Phase 3: Runtime & Playground (Week 5)

```
Week 5: Agent Execution
├── [ ] Set up apps/runtime (Mastra + Workers)
├── [ ] Agent hydration from D1 config
├── [ ] HTTP tool implementation
├── [ ] Streaming chat endpoint
├── [ ] Memory persistence (D1)
├── [ ] Playground UI
├── [ ] Message history display
├── [ ] Tool call visualization
├── [ ] Token usage display
└── [ ] Latency display
```

### Phase 4: Deploy & Launch (Week 6)

```
Week 6: Polish & Launch
├── [ ] Deploy flow (one-click)
├── [ ] API endpoint display
├── [ ] cURL example generator
├── [ ] Embed widget code generator
├── [ ] Basic usage logging
├── [ ] Usage dashboard
├── [ ] Landing page
├── [ ] Waitlist form
├── [ ] Documentation (getting started)
└── [ ] Launch on Product Hunt
```

### Phase 5: Growth Features (Weeks 7-10)

```
Week 7-8: Team & Billing
├── [ ] Team invitations
├── [ ] Role-based access
├── [ ] Stripe integration
├── [ ] Subscription management
├── [ ] Usage-based billing
├── [ ] Plan limits enforcement
└── [ ] Billing dashboard

Week 9-10: Advanced Features
├── [ ] Vector memory (Vectorize)
├── [ ] Custom domains
├── [ ] Webhooks
├── [ ] Agent templates
├── [ ] Search tool
├── [ ] SQL tool (D1)
└── [ ] Analytics dashboard
```

### Phase 6: Enterprise (Weeks 11-16)

```
├── [ ] SSO/SAML integration
├── [ ] Audit logging
├── [ ] Advanced analytics
├── [ ] SLA monitoring
├── [ ] Multi-agent workflows
├── [ ] Scheduled agents
├── [ ] Data residency options
└── [ ] Enterprise onboarding
```

---

## Success Metrics

### North Star Metric
**Monthly Active Agents (MAA)**: Agents that processed at least 1 message in the last 30 days

### Key Performance Indicators

| Metric | Week 6 Target | Month 3 Target | Month 6 Target |
|--------|---------------|----------------|----------------|
| Signups | 500 | 5,000 | 25,000 |
| Active Workspaces | 100 | 1,000 | 5,000 |
| Deployed Agents | 200 | 3,000 | 20,000 |
| Messages/day | 1,000 | 50,000 | 500,000 |
| Paid Customers | 10 | 100 | 500 |
| MRR | $500 | $5,000 | $25,000 |

### Health Metrics

| Metric | Target |
|--------|--------|
| P99 Latency | <500ms |
| Uptime | 99.9% |
| Error Rate | <0.1% |
| Churn Rate | <5%/mo |
| NPS | >50 |

### Funnel Metrics

```
Visitor → Signup:       Target 10%
Signup → First Agent:   Target 60%
First Agent → Deploy:   Target 40%
Deploy → Paid:          Target 5%
```

---

## Appendix

### Environment Variables

```bash
# .env.example

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# Database
DATABASE_URL=       # D1 binding name

# Auth (Better Auth)
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=https://api.hare.run

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
STRIPE_PRICE_TEAM=

# App
NEXT_PUBLIC_APP_URL=https://app.hare.run
NEXT_PUBLIC_API_URL=https://api.hare.run
```

### Cloudflare Resource Bindings

```toml
# wrangler.toml (apps/api)

name = "hare-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "D1"
database_name = "hare-production"
database_id = "xxx"

[[kv_namespaces]]
binding = "KV"
id = "xxx"

[[r2_buckets]]
binding = "R2"
bucket_name = "hare-storage"

[[vectorize]]
binding = "VECTORIZE"
index_name = "hare-embeddings"

[ai]
binding = "AI"
```

### Key Dependencies

```json
{
  "dependencies": {
    "@hono/zod-openapi": "^0.9.0",
    "@mastra/core": "^0.1.0",
    "@scalar/hono-api-reference": "^0.5.0",
    "better-auth": "^0.8.0",
    "drizzle-orm": "^0.29.0",
    "hono": "^4.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "stripe": "^14.0.0",
    "zod": "^3.22.0"
  }
}
```

---

*Last updated: December 2024*
*Version: 1.0.0*
