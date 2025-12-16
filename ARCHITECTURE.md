# Hare Architecture

> Technical implementation guide for the Hare SaaS platform.

---

## Monorepo Setup

### Directory Structure

```
hare/
├── apps/
│   ├── web/           # Next.js 15 dashboard (Cloudflare Pages)
│   ├── api/           # Hono API (Cloudflare Workers)
│   └── runtime/       # Agent execution (Cloudflare Workers)
├── packages/
│   ├── db/            # Drizzle ORM + D1 schema
│   ├── core/          # Shared types, schemas, utils
│   ├── ui/            # shadcn/ui components
│   └── auth/          # Better Auth config
├── tooling/
│   ├── eslint/        # Shared ESLint config
│   ├── typescript/    # Base tsconfig
│   └── tailwind/      # Tailwind preset
├── package.json       # Root workspace config
├── bun.lockb
└── turbo.json         # Optional: Turborepo
```

### Bun Workspaces Configuration

```json
// package.json (root)
{
  "name": "hare",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "tooling/*"
  ],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "dev:web": "bun run --filter @hare/web dev",
    "dev:api": "bun run --filter @hare/api dev",
    "build": "bun run --filter '*' build",
    "db:generate": "bun run --filter @hare/db generate",
    "db:migrate": "bun run --filter @hare/db migrate",
    "db:push": "bun run --filter @hare/db push",
    "typecheck": "bun run --filter '*' typecheck",
    "lint": "bun run --filter '*' lint",
    "format": "bun run --filter '*' format"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.3.0"
  }
}
```

---

## Apps

### apps/web — Next.js Dashboard

**Stack**: Next.js 15, React 19, Tailwind CSS, shadcn/ui

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   │   └── page.tsx
│   │   ├── sign-up/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar, header
│   │   ├── page.tsx                # Dashboard home
│   │   ├── agents/
│   │   │   ├── page.tsx            # Agent list
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Create agent
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Agent builder
│   │   │       ├── playground/
│   │   │       │   └── page.tsx    # Test agent
│   │   │       └── settings/
│   │   │           └── page.tsx    # Agent settings
│   │   ├── tools/
│   │   │   ├── page.tsx            # Tool library
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Tool config
│   │   ├── settings/
│   │   │   ├── page.tsx            # Workspace settings
│   │   │   ├── team/
│   │   │   │   └── page.tsx        # Team members
│   │   │   └── billing/
│   │   │       └── page.tsx        # Subscription
│   │   └── usage/
│   │       └── page.tsx            # Usage dashboard
│   ├── (marketing)/
│   │   ├── page.tsx                # Landing page
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   └── docs/
│   │       └── [...slug]/
│   │           └── page.tsx
│   ├── api/
│   │   └── auth/
│   │       └── [...all]/
│   │           └── route.ts        # Better Auth handler
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── agents/
│   │   ├── agent-card.tsx
│   │   ├── agent-form.tsx
│   │   ├── model-selector.tsx
│   │   ├── instructions-editor.tsx
│   │   └── tool-picker.tsx
│   ├── chat/
│   │   ├── chat-interface.tsx
│   │   ├── message-list.tsx
│   │   ├── message-bubble.tsx
│   │   ├── chat-input.tsx
│   │   └── streaming-text.tsx
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── workspace-switcher.tsx
│   └── providers/
│       ├── auth-provider.tsx
│       └── query-provider.tsx
├── lib/
│   ├── api.ts                      # API client (fetch wrapper)
│   ├── auth-client.ts              # Better Auth client
│   └── utils.ts
├── hooks/
│   ├── use-agents.ts
│   ├── use-chat.ts
│   └── use-workspace.ts
├── next.config.ts
├── wrangler.toml                   # Cloudflare Pages config
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**package.json**:
```json
{
  "name": "@hare/web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "preview": "wrangler pages dev",
    "deploy": "wrangler pages deploy"
  },
  "dependencies": {
    "@hare/ui": "workspace:*",
    "@hare/core": "workspace:*",
    "@hare/auth": "workspace:*",
    "@tanstack/react-query": "^5.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

**next.config.ts** (Cloudflare):
```typescript
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

if (process.env.NODE_ENV === 'development') {
  setupDevPlatform();
}

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
```

---

### apps/api — Hono REST API

**Stack**: Hono, Drizzle, Zod OpenAPI, Scalar

```
apps/api/
├── src/
│   ├── index.ts                    # App entry, middleware
│   ├── routes/
│   │   ├── index.ts                # Route aggregator
│   │   ├── auth.ts                 # Auth endpoints
│   │   ├── workspaces.ts           # Workspace CRUD
│   │   ├── agents.ts               # Agent CRUD
│   │   ├── tools.ts                # Tool CRUD
│   │   ├── chat.ts                 # Chat (proxy to runtime)
│   │   ├── usage.ts                # Usage stats
│   │   └── webhooks/
│   │       ├── stripe.ts           # Stripe webhooks
│   │       └── index.ts
│   ├── middleware/
│   │   ├── auth.ts                 # Auth middleware
│   │   ├── workspace.ts            # Workspace context
│   │   ├── rate-limit.ts           # Rate limiting (KV)
│   │   └── error.ts                # Error handling
│   ├── lib/
│   │   ├── db.ts                   # D1 client
│   │   ├── kv.ts                   # KV helpers
│   │   ├── stripe.ts               # Stripe client
│   │   └── openapi.ts              # OpenAPI config
│   └── types.ts                    # Env bindings
├── wrangler.toml
├── tsconfig.json
└── package.json
```

**src/index.ts**:
```typescript
import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import { authRoutes } from './routes/auth';
import { workspaceRoutes } from './routes/workspaces';
import { agentRoutes } from './routes/agents';
import { toolRoutes } from './routes/tools';
import { chatRoutes } from './routes/chat';
import { usageRoutes } from './routes/usage';
import { webhookRoutes } from './routes/webhooks';
import { authMiddleware } from './middleware/auth';
import { errorMiddleware } from './middleware/error';
import type { Env } from './types';

const app = new OpenAPIHono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['https://app.hare.run', 'http://localhost:3000'],
  credentials: true,
}));
app.use('*', errorMiddleware());

// Public routes
app.route('/auth', authRoutes);
app.route('/webhooks', webhookRoutes);

// Protected routes
app.use('/v1/*', authMiddleware());
app.route('/v1/workspaces', workspaceRoutes);
app.route('/v1/agents', agentRoutes);
app.route('/v1/tools', toolRoutes);
app.route('/v1/chat', chatRoutes);
app.route('/v1/usage', usageRoutes);

// OpenAPI documentation
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Hare API',
    version: '1.0.0',
    description: 'Build and deploy AI agents to the edge',
  },
  servers: [
    { url: 'https://api.hare.run', description: 'Production' },
  ],
});

app.get('/docs', apiReference({
  spec: { url: '/openapi.json' },
  theme: 'purple',
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
```

**src/types.ts**:
```typescript
export interface Env {
  // Databases
  D1: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  
  // Secrets
  BETTER_AUTH_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  
  // Service bindings
  RUNTIME: Fetcher;  // Agent runtime worker
}
```

**wrangler.toml**:
```toml
name = "hare-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "D1"
database_name = "hare-production"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"

[[r2_buckets]]
binding = "R2"
bucket_name = "hare-storage"

[[vectorize]]
binding = "VECTORIZE"
index_name = "hare-embeddings"

[ai]
binding = "AI"

[[services]]
binding = "RUNTIME"
service = "hare-runtime"

[vars]
ENVIRONMENT = "production"
```

---

### apps/runtime — Agent Execution

**Stack**: Hono, Mastra, Workers AI

```
apps/runtime/
├── src/
│   ├── index.ts                    # Worker entry
│   ├── agent.ts                    # Agent factory
│   ├── memory.ts                   # Memory layer
│   ├── streaming.ts                # SSE streaming
│   ├── tools/
│   │   ├── index.ts                # Tool registry
│   │   ├── http.ts                 # HTTP request tool
│   │   ├── search.ts               # Web search tool
│   │   ├── sql.ts                  # D1 SQL tool
│   │   └── custom.ts               # Custom tool executor
│   ├── models/
│   │   ├── index.ts                # Model registry
│   │   ├── workers-ai.ts           # Workers AI provider
│   │   └── openai.ts               # OpenAI provider
│   └── types.ts
├── wrangler.toml
├── tsconfig.json
└── package.json
```

**src/index.ts**:
```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createAgentFromConfig } from './agent';
import { loadAgentConfig, saveMessage, logUsage } from './db';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

app.post('/agents/:id/chat', async (c) => {
  const agentId = c.req.param('id');
  const { message, sessionId, metadata } = await c.req.json();
  
  // Load agent configuration
  const config = await loadAgentConfig(agentId, c.env.D1);
  if (!config) {
    return c.json({ error: 'Agent not found' }, 404);
  }
  
  // Check if agent is deployed
  if (config.status !== 'deployed') {
    return c.json({ error: 'Agent not deployed' }, 400);
  }
  
  // Create agent instance
  const agent = createAgentFromConfig(config, c.env);
  
  // Stream response
  return streamSSE(c, async (stream) => {
    const startTime = Date.now();
    let tokensIn = 0;
    let tokensOut = 0;
    let fullResponse = '';
    
    try {
      const result = await agent.generate(message, {
        sessionId: sessionId || crypto.randomUUID(),
        metadata,
        onToken: async (token: string) => {
          tokensOut++;
          fullResponse += token;
          await stream.writeSSE({
            event: 'message',
            data: JSON.stringify({ type: 'text', content: token }),
          });
        },
        onToolCall: async (call: ToolCall) => {
          await stream.writeSSE({
            event: 'tool_call',
            data: JSON.stringify({ type: 'tool_call', ...call }),
          });
        },
        onToolResult: async (result: ToolResult) => {
          await stream.writeSSE({
            event: 'tool_result', 
            data: JSON.stringify({ type: 'tool_result', ...result }),
          });
        },
      });
      
      tokensIn = result.tokensIn;
      
      // Save message to database
      await saveMessage(c.env.D1, {
        agentId,
        sessionId: sessionId || result.sessionId,
        role: 'assistant',
        content: fullResponse,
        tokensIn,
        tokensOut,
      });
      
      // Log usage
      await logUsage(c.env.D1, {
        workspaceId: config.workspaceId,
        agentId,
        tokensIn,
        tokensOut,
        latencyMs: Date.now() - startTime,
        model: config.model,
      });
      
      // Final event
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({
          type: 'done',
          sessionId: result.sessionId,
          usage: {
            tokensIn,
            tokensOut,
            latencyMs: Date.now() - startTime,
          },
        }),
      });
    } catch (error) {
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      });
    }
  });
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
```

**src/agent.ts**:
```typescript
import { Agent, createTool } from '@mastra/core';
import { getModel } from './models';
import { createMemory } from './memory';
import { getToolExecutor } from './tools';
import type { AgentConfig, Env } from './types';

export function createAgentFromConfig(config: AgentConfig, env: Env): Agent {
  // Build tools
  const tools = config.tools.map(toolConfig => {
    const executor = getToolExecutor(toolConfig.type, env);
    return createTool({
      id: toolConfig.id,
      name: toolConfig.name,
      description: toolConfig.description,
      inputSchema: toolConfig.inputSchema,
      execute: (input) => executor(input, toolConfig.config),
    });
  });
  
  // Get model provider
  const model = getModel(config.model, env);
  
  // Create memory if enabled
  const memory = config.memory?.enabled
    ? createMemory(config.memory, env)
    : undefined;
  
  return new Agent({
    name: config.name,
    instructions: config.instructions,
    model,
    tools,
    memory,
  });
}
```

---

## Packages

### packages/db — Database Schema

```
packages/db/
├── src/
│   ├── index.ts                    # Exports
│   ├── client.ts                   # DB client factory
│   ├── schema/
│   │   ├── index.ts                # Schema exports
│   │   ├── users.ts
│   │   ├── workspaces.ts
│   │   ├── agents.ts
│   │   ├── tools.ts
│   │   ├── conversations.ts
│   │   ├── messages.ts
│   │   ├── deployments.ts
│   │   └── usage.ts
│   └── relations.ts                # Drizzle relations
├── migrations/                     # SQL migrations
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

**drizzle.config.ts**:
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
} satisfies Config;
```

---

### packages/core — Shared Types

```
packages/core/
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── agent.ts
│   │   ├── tool.ts
│   │   ├── message.ts
│   │   ├── workspace.ts
│   │   └── user.ts
│   ├── schemas/
│   │   ├── index.ts
│   │   ├── agent.ts                # Zod schemas
│   │   ├── tool.ts
│   │   └── api.ts
│   ├── constants.ts
│   └── utils/
│       ├── id.ts                   # ID generation
│       └── errors.ts               # Error classes
├── tsconfig.json
└── package.json
```

**src/types/agent.ts**:
```typescript
export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  model: ModelId;
  instructions: string;
  config: AgentConfig;
  status: AgentStatus;
  tools: AgentTool[];
  deployedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConfig {
  temperature: number;
  maxTokens: number;
  topP?: number;
  stopSequences?: string[];
  memory: MemoryConfig;
}

export interface MemoryConfig {
  enabled: boolean;
  maxMessages: number;
  retentionDays: number;
}

export type AgentStatus = 'draft' | 'deployed' | 'archived';

export type ModelId = 
  | 'llama-3.1-70b-instruct'
  | 'llama-3.1-8b-instruct'
  | 'mistral-7b-instruct'
  | 'gpt-4-turbo'
  | 'gpt-4o'
  | 'claude-3-opus'
  | 'claude-3-sonnet';
```

---

### packages/ui — Shared Components

```
packages/ui/
├── src/
│   ├── index.ts
│   ├── components/
│   │   ├── ui/                     # shadcn primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── agent/                  # Agent components
│   │   │   ├── agent-card.tsx
│   │   │   ├── agent-status.tsx
│   │   │   ├── model-selector.tsx
│   │   │   ├── instructions-editor.tsx
│   │   │   └── tool-picker.tsx
│   │   ├── chat/                   # Chat components
│   │   │   ├── message-bubble.tsx
│   │   │   ├── chat-input.tsx
│   │   │   ├── streaming-text.tsx
│   │   │   └── tool-call-card.tsx
│   │   └── layout/                 # Layout components
│   │       ├── page-header.tsx
│   │       └── empty-state.tsx
│   └── lib/
│       ├── utils.ts                # cn() helper
│       └── hooks.ts                # Shared hooks
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

### packages/auth — Better Auth

```
packages/auth/
├── src/
│   ├── index.ts
│   ├── server.ts                   # Server auth instance
│   ├── client.ts                   # Client auth hooks
│   ├── middleware.ts               # Auth middleware (Hono)
│   └── config.ts                   # Auth configuration
├── tsconfig.json
└── package.json
```

**src/server.ts**:
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@hare/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
```

**src/client.ts**:
```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

---

## Cloudflare Deployment

### D1 Database Setup

```bash
# Create database
wrangler d1 create hare-production

# Run migrations
wrangler d1 migrations apply hare-production

# Local development
wrangler d1 migrations apply hare-production --local
```

### KV Namespace Setup

```bash
# Create namespaces
wrangler kv:namespace create "SESSIONS"
wrangler kv:namespace create "RATE_LIMIT"
wrangler kv:namespace create "CACHE"
```

### R2 Bucket Setup

```bash
# Create bucket
wrangler r2 bucket create hare-storage
```

### Vectorize Index Setup

```bash
# Create index
wrangler vectorize create hare-embeddings --dimensions 1536 --metric cosine
```

### Deployment Commands

```bash
# Deploy API
cd apps/api && wrangler deploy

# Deploy Runtime
cd apps/runtime && wrangler deploy

# Deploy Web (Pages)
cd apps/web && wrangler pages deploy .next
```

---

## Development Workflow

### Local Development

```bash
# Install dependencies
bun install

# Start all services
bun run dev

# Or start individually
bun run dev:web    # Next.js on :3000
bun run dev:api    # Hono on :8787
```

### Database Commands

```bash
# Generate migration
bun run db:generate

# Apply migration (local)
bun run db:push

# Apply migration (production)
bun run db:migrate
```

### Type Checking

```bash
# Check all packages
bun run typecheck

# Check specific package
bun run --filter @hare/web typecheck
```

---

## Key Implementation Notes

### Authentication Flow

1. User signs up/in via Better Auth on web app
2. Session stored in D1 (via Drizzle adapter)
3. API requests include session cookie
4. Hono middleware validates session against D1
5. User context injected into request

### Agent Deployment Flow

1. User clicks "Deploy" in web app
2. Web app calls `POST /v1/agents/:id/deploy`
3. API validates agent config
4. API creates deployment record in D1
5. API updates agent status to "deployed"
6. Runtime worker reads config from D1 on each request

### Chat Flow

1. Client sends message to `POST /v1/agents/:id/chat`
2. API validates auth, forwards to Runtime worker
3. Runtime loads agent config from D1
4. Runtime creates Mastra agent instance
5. Agent streams response via SSE
6. Runtime saves message and usage to D1
7. Client receives streaming tokens

### Rate Limiting

- Stored in KV with TTL
- Key format: `rate:{workspaceId}:{endpoint}:{minute}`
- Limits based on plan tier
- Returns 429 when exceeded

---

## Security Considerations

1. **Auth**: All API routes protected except /auth and /webhooks
2. **CORS**: Strict origin whitelist
3. **Rate Limiting**: Per-workspace, per-endpoint
4. **Input Validation**: Zod schemas on all inputs
5. **SQL Injection**: Drizzle ORM (parameterized queries)
6. **XSS**: React escaping + secure headers
7. **Secrets**: Stored in Cloudflare secrets, never in code
