---
description: Hare - AI agent platform on Cloudflare edge
globs: "**/*.ts, **/*.tsx, **/*.json"
alwaysApply: true
---

# Hare Development Guide

Hare is an AI agent platform deployed on Cloudflare's edge network. This guide ensures consistent, high-quality contributions.

## Tech Stack

- **Runtime**: Bun 1.3.5 (use `bun` for all package management)
- **Frontend**: Vite 7, React 19, TanStack Router, shadcn/ui, Tailwind CSS
- **API**: Hono with OpenAPI/Zod validation
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
- **AI**: Vercel AI SDK + Workers AI (Llama, Mistral, etc.)
- **Auth**: Better Auth
- **Infra**: Cloudflare Workers, D1, KV, R2, Vectorize, Agents SDK

## Commands

```sh
# Development
bun install              # Install dependencies
bun run dev              # Start dev server (Turbo)
bun run build            # Build for production
bun run preview          # Test on local Cloudflare runtime

# Code Quality
bun run checks           # Run all checks (deps, sort-pkg, lint, typecheck, build)
bun run check:fix        # Lint + format with Biome only
bun run typecheck        # TypeScript check only

# Testing
bun run test             # Run Vitest tests
bun run test:watch       # Watch mode
bun run test:coverage    # Coverage report
bun run test:e2e         # Playwright E2E tests

# Database
bun run db:generate      # Generate migrations from schema
bun run db:migrate:local # Apply to local D1
bun run db:push          # Push schema directly
bun run db:studio        # Open Drizzle Studio
```

## Project Structure

```
packages/
├── api/src/routes/         # Hono API routes
│   ├── agents/             # Agent routes (split by feature)
│   │   ├── crud.ts         # CRUD operations
│   │   ├── deployment.ts   # Deploy/undeploy/rollback
│   │   ├── validation.ts   # Config validation
│   │   └── helpers.ts      # Shared helpers
│   ├── chat.ts             # Chat/conversation routes
│   └── ...                 # Other route modules
├── config/src/             # Centralized configuration
│   ├── config.ts           # Unified config object
│   ├── models.ts           # AI model definitions
│   ├── templates.ts        # Agent templates
│   ├── enums.ts            # Status/role enums
│   └── content.ts          # UI content strings
├── db/src/schema/          # Drizzle table definitions
├── tools/src/              # Agent tool implementations
└── app/                    # React components & widgets
```

## Code Style (Biome)

- **Indentation**: Tabs
- **Quotes**: Single quotes
- **Semicolons**: No (omit when possible)
- **Line width**: 100 characters
- **Imports**: No unused imports/variables (error)

Run `bun run check:fix` before committing.

## Patterns

### API Routes (Hono)
```ts
// apps/web/src/lib/api/routes/example.ts
import { Hono } from 'hono'
import { z } from 'zod'

const schema = z.object({ name: z.string() })

export const exampleRoutes = new Hono()
  .post('/example', zValidator('json', schema), async (c) => {
    const { name } = c.req.valid('json')
    return c.json({ message: `Hello ${name}` })
  })
```

### Database (Drizzle)
```ts
// Schema in apps/web/src/db/schema/
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
})
```

### React Components
```tsx
// Use shadcn/ui components from @/components/ui
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'

export function Example() {
  const { data } = useQuery({ queryKey: ['items'], queryFn: fetchItems })
  return <Button onClick={handleClick}>Click me</Button>
}
```

### AI/Streaming
```ts
import { streamText } from 'ai'
import { createWorkersAI } from '@/lib/agents/providers/workers-ai'

const result = await streamText({
  model: createWorkersAI('@cf/meta/llama-3.3-70b-instruct-fp8-fast', env.AI),
  messages,
  tools: agentTools,
})
```

## Cloudflare Bindings

Access via `env` in API routes:
- `env.DB` - D1 database
- `env.KV` - Key-value store
- `env.R2` - Object storage
- `env.AI` - Workers AI
- `env.VECTORIZE` - Vector database

## Testing

Hare uses **Vitest** for unit/integration tests and **Playwright** for E2E tests.

### Test Structure

```
hare/
├── packages/
│   ├── agent/src/__tests__/          # Agent package unit tests
│   ├── api/src/
│   │   ├── __tests__/                # API package unit tests
│   │   ├── middleware/__tests__/     # Middleware tests
│   │   └── routes/__tests__/         # Route handler tests
│   └── testing/src/                  # Shared test utilities
│       ├── factories/                # Test data factories
│       ├── mocks/                    # Mock implementations
│       └── seeds/                    # Database seeding utilities
└── apps/web/e2e/                     # E2E tests (*.e2e.ts)
```

### Naming Conventions

| Test Type | File Pattern | Location |
|-----------|--------------|----------|
| Unit tests | `*.test.ts` | `__tests__/` alongside source |
| Integration tests | `*.integration.test.ts` | `__tests__/` alongside source |
| E2E tests | `*.e2e.ts` | `apps/web/e2e/` |

### Unit Test Example

```ts
// packages/api/src/__tests__/example.test.ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('ExampleService', () => {
  it('should do something specific', () => {
    expect(someFunction('test')).toBe('expected')
  })
})
```

### Integration Test Example

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { seedAgent, cleanupSeededData } from '@hare/testing'

describe('Agents Route', () => {
  beforeEach(async () => {
    await cleanupSeededData(env.DB)
  })

  it('should create an agent', async () => {
    const { workspace } = await seedAgent(env.DB)
    // ... test route handler
  })
})
```

### E2E Test Example

```ts
// apps/web/e2e/example.e2e.ts
import { test, expect } from './fixtures'

test.describe('Feature Name', () => {
  test('should complete user flow', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/agents')
    await authenticatedPage.getByRole('button', { name: 'Create Agent' }).click()
    await expect(authenticatedPage).toHaveURL(/\/dashboard\/agents\//)
  })
})
```

### Factories & Seeds (`@hare/testing`)

```ts
import {
  createTestUser, createTestWorkspace, createTestAgent,
  seedAgent, seedAgentWithTools, seedCompleteEnvironment,
  cleanupSeededData, resetAllFactoryCounters,
  createMockEnv,
} from '@hare/testing'

// Factories
const user = createTestUser({ name: 'Custom Name' })
const agent = createTestAgent({ workspaceId: workspace.id, createdBy: user.id })

// Seeds (hit real D1)
const { user, workspace, agent } = await seedAgent(env.DB)
const { agent, tools } = await seedAgentWithTools(env.DB, { toolCount: 3 })

// Cleanup
await cleanupSeededData(env.DB)
resetAllFactoryCounters() // call in beforeEach
```

### E2E Fixtures

```ts
import { test, expect, generateTestUser } from './fixtures'

// authenticatedPage - already signed in
test('auth test', async ({ authenticatedPage }) => { ... })

// page + testUser - sign up yourself
test('signup test', async ({ page, testUser }) => { ... })
```

### Best Practices

1. **Isolate tests** - call `resetAllFactoryCounters()` and `cleanupSeededData()` in `beforeEach`
2. **Co-locate tests** - place `__tests__/` dirs alongside the source being tested
3. **Use descriptive names** - start with "should" and describe the expected behavior
4. **Mock at boundaries** - mock external services, not internal implementation
5. **Always await** - use `await` for all async operations in tests

## Git Commits

Use gitmoji spec:
- `feat:` or `:sparkles:` - New feature
- `fix:` or `:bug:` - Bug fix
- `refactor:` or `:recycle:` - Refactoring
- `docs:` or `:memo:` - Documentation
- `test:` or `:white_check_mark:` - Tests
- `chore:` or `:wrench:` - Maintenance

## Key Conventions

1. **Type Safety**: Use Zod for runtime validation, TypeScript for compile-time
2. **Error Handling**: Use Hono's built-in error handling, throw HTTPException
3. **State**: TanStack Query for server state, React state for UI
4. **Styling**: Tailwind CSS + shadcn/ui, use `cn()` for conditional classes
5. **Paths**: Use `@/` alias for imports from `src/`
6. **Function Parameters**: Functions with >1 parameter should accept a single options object

```ts
// Bad
function createUser(name: string, email: string, role: string) {}

// Good
function createUser(options: { name: string; email: string; role: string }) {}
```

7. **Clean Refactors Only**: When refactoring, do clean rewrites - no backwards compatibility hacks
   - Delete unused code completely; don't rename to `_unused` or add `// removed` comments
   - Don't add fallback paths "just in case" - if something is being replaced, replace it fully
   - Don't re-export removed types or keep duplicate code paths during transitions
   - Update all call sites in the same PR rather than maintaining two patterns
   - If migration requires multiple PRs, use feature flags - not runtime compatibility layers

---

## Claude Code Work Directory

All temporary work, drafts, logs, and session artifacts should be organized in the `.claude/work` directory:

```
.claude/work/
├── <session-id>/           # One directory per session (use first 8 chars of conversation ID or timestamp-based ID like 20251226-143022)
│   ├── notes.md            # Session notes, plans, observations
│   ├── drafts/             # Draft files before finalizing
│   ├── logs/               # Command output, test results
│   └── artifacts/          # Generated files, exports, etc.
└── shared/                 # Cross-session resources (templates, reference files)
```

**Session ID Format**: Use timestamp-based IDs like `YYYYMMDD-HHMMSS` (e.g., `20251226-143022`) for easy chronological sorting. Create a new session directory at the start of each conversation when work files are needed.

**Guidelines**:
- Create `.claude/work/<session-id>/` when you need to store any temporary files
- Keep final/production files in their proper project locations, not in work directory
- The `.claude/work/` directory should be gitignored
- Clean up old session directories periodically (sessions older than 7 days can be removed)

---

## Adding New Tools

Tools are in `apps/web/src/lib/agents/tools/`. Use `createTool` for type safety:

```ts
// apps/web/src/lib/agents/tools/my-tool.ts
import { z } from 'zod'
import { createTool, success, failure, type ToolContext } from './types'

export const myTool = createTool({
  id: 'my_tool',
  description: 'Short description of what the tool does',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
    limit: z.number().optional().default(10).describe('Max results'),
  }),
  execute: async (params, context: ToolContext) => {
    try {
      // Access Cloudflare bindings via context.env
      const result = await context.env.KV.get(params.query)
      return success({ data: result })
    } catch (error) {
      return failure(`Failed: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  },
})

// Export getter for tool factory
export function getMyTools(context: ToolContext) {
  return [myTool]
}
```

Then register in `apps/web/src/lib/agents/tools/index.ts`:
1. Add export for your tool
2. Add to `getSystemTools()` function
3. Add tool ID to `SYSTEM_TOOL_IDS` array

**Tool Categories**: storage, database, search, http, utility, integrations, ai, data, sandbox, validation, transform

---

## MCP (Model Context Protocol)

The MCP agent (`apps/web/src/lib/agents/mcp-agent.ts`) exposes tools to external AI clients:

- Extends `McpAgent` from Cloudflare Agents SDK
- Auto-registers all system tools via `getSystemTools()`
- Converts Zod schemas to JSON Schema for MCP compatibility
- Exposes workspace resources

To add MCP-specific resources:
```ts
this.server.resource('my-resource', 'Description', async () => ({
  contents: [{ uri: 'hare://...', mimeType: 'application/json', text: '...' }]
}))
```

---

## Deployment

### Local Development
```sh
bun run dev              # Start with Turbo (uses Vite + Miniflare)
bun run preview          # Test on local Cloudflare runtime
```

### Production (Cloudflare Workers)
```sh
bun run build            # Build with Vite
bun run deploy           # Deploy to Cloudflare Workers
```

### Database Migrations
```sh
bun run db:generate      # Generate from Drizzle schema changes
bun run db:migrate:local # Apply to local D1
bun run db:migrate:remote # Apply to production D1
```

### Pre-deploy Checklist
1. `bun run checks` - All checks pass (runs deps, sort-pkg, lint with auto-fix, typecheck, build)
2. `bun run test` - All tests pass
3. Database migrations applied if schema changed

---

## Security Guidelines

### SSRF Protection
The HTTP tool (`packages/tools/src/http.ts`) includes SSRF protection that blocks:
- Private IP ranges (localhost, 127.0.0.1, 10.x, 172.16.x, 192.168.x)
- Cloud metadata endpoints (169.254.169.254)
- Non-HTTP protocols

Always validate URLs before making external requests in tools.

### API Key Security
API keys are stored as hashes only - never store plaintext keys:
```ts
// packages/db/src/schema/usage.ts
hashedKey: text('hashedKey').notNull(), // Only hash stored
prefix: text('prefix').notNull(),        // First few chars for identification
```

### Input Validation
- Use Zod schemas for all API inputs
- Validate agent instructions with `validateAgentInstructions()`
- Sanitize user content before rendering

---

## Performance Patterns

### Database Indexing
All frequently-queried columns should be indexed. Current indexes:
- `agents_workspace_idx` - Agent listing by workspace
- `conversations_agent_idx` - Conversations by agent
- `messages_conversation_idx` - Messages by conversation
- `usage_workspace_created_idx` - Usage analytics
- `api_keys_hashed_key_idx` - API key auth lookups

### Avoiding N+1 Queries
Use batch queries with `inArray` instead of iterating:
```ts
// Bad - N+1 pattern
for (const agent of agents) {
  const tools = await db.select().from(agentTools).where(eq(agentTools.agentId, agent.id))
}

// Good - batch query
const agentIds = agents.map(a => a.id)
const allTools = await db.select().from(agentTools).where(inArray(agentTools.agentId, agentIds))
const toolsByAgent = new Map(/* group by agentId */)
```

### React Memoization
Memoize components in virtualized lists:
```tsx
export const MessageBubble = memo(function MessageBubble({ message, isStreaming }) {
  // Component implementation
})
```

---

## Gitmoji Reference

| Emoji | Code | Use |
|-------|------|-----|
| ✨ | `:sparkles:` | New feature |
| 🐛 | `:bug:` | Bug fix |
| ♻️ | `:recycle:` | Refactor |
| 📝 | `:memo:` | Docs |
| ✅ | `:white_check_mark:` | Tests |
| 🔧 | `:wrench:` | Config |
| ⬆️ | `:arrow_up:` | Upgrade deps |
| 🎨 | `:art:` | Style/format |
| 🔥 | `:fire:` | Remove code |
| 🚀 | `:rocket:` | Deploy |
| 💄 | `:lipstick:` | UI/cosmetic |
| 🏗️ | `:building_construction:` | Architecture |
