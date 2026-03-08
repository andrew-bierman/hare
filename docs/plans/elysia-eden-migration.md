# Elysia + Eden Treaty Migration Plan

## Overview

Replace Hono + oRPC with Elysia + Eden Treaty for end-to-end type-safe API with a single framework.

## Current Architecture

- **Hono routes** (5 modules): auth, agent-ws, mcp, billing, dev
- **oRPC routers** (18 routers at `/api/rpc`): agents, webhooks, chat, tools, etc.
- **Client**: oRPC client with TanStack Query hooks (780+ lines in `orpc-hooks.ts`)

## Key Decisions

### Zod Compatibility
Use `@elysiajs/zod` plugin during migration to keep existing Zod schemas. Convert to TypeBox later.

### Better Auth
Use `Elysia.mount()` which accepts any fetch-compatible handler. Better Auth's `.handler()` already accepts Request/returns Response.

### AI SDK Streaming
Keep using `DefaultChatTransport` with direct fetch URL initially. Elysia routes serve same streaming response at same path. Migrate to Eden-based transport later.

### Parallel Mounting During Migration
Both frameworks run side-by-side:
```ts
const app = new OpenAPIHono<HonoEnv>().basePath('/api')
  .route('/auth', auth)          // Keep on Hono
  .route('/rpc', orpcApp)        // oRPC (shrinking)
  .route('/v2', elysiaAdapter)   // New Elysia routes (growing)
```

## Migration Order (by router complexity)

### Phase 1: Foundation (1 PR)
- Install Elysia, Eden, `@elysiajs/zod`
- Base app with CloudflareAdapter
- Workspace/auth middleware
- Eden client with workspace header injection
- Migrate `health` router (3 public procedures, no auth)

### Phase 2: Read-Only Routers (2-3 PRs)
- activity, logs, audit-logs, usage, analytics, user-settings

### Phase 3: CRUD Routers (3-4 PRs)
- api-keys, workspaces, tools, schedules, memory, workspace-members

### Phase 4: Complex Routers (2-3 PRs)
- billing (Stripe), webhooks (SSRF), agents (14 procedures)

### Phase 5: Streaming (2 PRs)
- embed (public SSE), chat (AI SDK streaming)

### Phase 6: Hono Routes (2-3 PRs)
- dev, billing webhook, auth (Better Auth mount), agent-ws, mcp (WebSocket)

### Phase 7: Cleanup (1 PR)
- Remove Hono, oRPC, delete old directories

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| CloudflareAdapter maturity | HIGH | Test every PR with `bun run preview` |
| Better Auth mount path matching | HIGH | Test all auth flows after mounting |
| WebSocket on CF Workers via Elysia | HIGH | May need Hono for WS routes |
| Zod v4 compatibility with plugin | MEDIUM | Test early in Phase 1 |
| AI SDK streaming protocol | MEDIUM | Test in Phase 5 |

## Per-Router Migration Checklist

For each router:
1. Create Elysia route in `packages/api/src/elysia/routers/`
2. Mount in Elysia app
3. Create Eden-based hooks in `eden-hooks.ts`
4. Update page imports from orpc-hooks to eden-hooks
5. Remove oRPC router from appRouter
6. Delete oRPC router file
7. Run full checks + tests
