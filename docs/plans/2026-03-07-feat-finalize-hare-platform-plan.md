---
title: "Finalize Hare Platform"
type: feat
status: active
date: 2026-03-07
---

# Finalize Hare Platform

## Overview

Hare is a SaaS platform for creating, deploying, and managing AI agents on Cloudflare's edge network. The core architecture is solid — build, typecheck, and lint all pass — but the project has accumulated bugs, dead code, broken UI flows, and disabled tests. This plan covers a focused finalization: fix real bugs, remove dead code, mark unfinished features clearly, and stabilize CI.

## Architectural Context: Hono + oRPC Duality

The codebase has **two API layers** that the plan must account for:
- **Hono routes** (`packages/api/src/routes/`) — 10 files, handles agents, auth, billing, mcp, dev, agent-ws
- **oRPC routers** (`packages/api/src/orpc/routers/`) — 18 routers covering the full feature set including webhooks, analytics, usage

Some UI pages (notably webhooks) use raw `fetch()` against Hono-style REST paths, while the backend implementation exists only in oRPC. This mismatch is the root cause of several "missing endpoint" issues.

## Current State Assessment

**What works:**
- Build pipeline passes (Vite + Turbo)
- TypeScript compiles cleanly (17 packages, zero errors)
- Biome lint passes (191 files, no issues)
- 1,805 unit tests pass across 58 test files
- 84 E2E tests pass (landing, auth, dashboard)
- Core agent CRUD, chat interface, auth flows functional

**What's broken:**
- 12 API route test files disabled (~8,484 lines) — zero test coverage on core API
- 13 E2E tests skipped (webhooks, tool editing)
- Chat session continuity bug (stale closure in `use-chat.ts`)
- Hardcoded "Active Tools: 6" on dashboard
- Webhook UI uses raw `fetch()` against non-existent Hono routes (backend exists in oRPC)
- Dead code: 3 duplicate dashboard pages (~1,016 lines), duplicate WebSocket hook (~351 lines)
- Usage page shows misleading per-agent card with no real data
- CI fragility (20 of last 30 commits are Playwright CI fixes)

## Implementation Phases

### Phase 1: Critical Bug Fixes

Fix bugs that break core user flows.

#### 1.1 Chat Session Continuity Bug
**File:** `packages/app/shared/api/hooks/use-chat.ts:113-121`
**Bug:** `DefaultChatTransport` is created with `useMemo` and captures `sessionIdRef.current` eagerly in the `body` property. Since `sessionIdRef.current` is `null` when the memo first runs (dependency: `[agentId]`), the session ID captured from the first response header is never sent back. Multi-turn conversations cannot resume sessions.
**Fix:** The AI SDK's `body` property accepts `Resolvable<object>`, which includes `() => object`. Change `body` from a static object to a function so it reads `sessionIdRef.current` at call time:

```ts
// Before (broken — captures null at construction time)
body: sessionIdRef.current ? { sessionId: sessionIdRef.current } : {},

// After (reads current value on each request)
body: () => sessionIdRef.current ? { sessionId: sessionIdRef.current } : {},
```

- [x] Fix stale closure: change `body` to a function in `DefaultChatTransport` — `packages/app/shared/api/hooks/use-chat.ts:117`
- [x] Wrap `fetchWithSessionCapture` in `useMemo` to eliminate fragile eslint-disable — `use-chat.ts:103`
- [ ] Verify multi-turn chat sessions persist correctly after fix

#### 1.2 Hardcoded Dashboard Stats
**File:** `packages/app/pages/dashboard/DashboardPage.tsx:106`
**Bug:** "Active Tools" stat card shows hardcoded `value: '6'`. The other 3 stats (Total Agents, API Calls, Tokens Used) all use real query data.
**Fix:** Derive tools count from existing data (e.g., aggregate unique tool IDs across agents) or add a tools query. Show `'--'` if data is unavailable — no need for elaborate loading/error states on a single number.

- [x] Replace hardcoded `'6'` with real tools count — `packages/app/pages/dashboard/DashboardPage.tsx:106`
- [x] Add tools query hook or derive from existing agent data

#### 1.3 Webhook UI — Rewire to oRPC
**File:** `packages/app/pages/agents/AgentWebhooksPage.tsx`
**Bug:** The UI uses raw `fetch()` against Hono-style REST paths (`/api/agents/{agentId}/webhooks`, etc.) but the webhook backend only exists as oRPC procedures at `packages/api/src/orpc/routers/webhooks.ts` (549 lines, full CRUD with logs, deliveries, secret regeneration, retry). The Hono routes directory has zero webhook files. Every API call from this page 404s.
**Fix:** Rewire the webhook page to use the oRPC client (matching the pattern used by every other page in the app) instead of raw `fetch()`. Also fix:
- Inline type definitions (lines 65-88) — import from shared types/schema instead
- `useState` + `useEffect` data fetching in `WebhookLogsDialog` — use `useQuery` from TanStack Query

- [x] Replace raw `fetch()` calls (lines 127-268) with oRPC client calls — `AgentWebhooksPage.tsx`
- [x] Replace inline `Webhook`/`WebhookLog`/`WebhookDelivery` types with shared schema imports
- [x] Convert `WebhookLogsDialog` from `useState`+`useEffect` to `useQuery`
- [ ] Verify webhook CRUD works end-to-end against oRPC backend
- [ ] Verify database migration includes webhook tables in D1

#### 1.4 Unfinished Features — "Coming Soon" Guards
**Issue:** Several features have UI but no working backend or incomplete data pipelines. They currently show broken/empty states.
**Fix:** Add clear "Coming Soon" indicators and prevent broken API calls.

- [x] Add "Coming Soon" state to Scheduled Tasks widget — prevent 404 API calls — **NOT NEEDED**: properly wired to `orpc.schedules` with full CRUD hooks and empty states
- [x] Verify Analytics page works against `orpc.analytics.get()` — if broken, add "Coming Soon" — **VERIFIED**: `analyticsRouter` registered, `useAnalyticsQuery` properly wired
- [x] Audit Settings page for disabled email features — ensure clean disabled states — **VERIFIED**: 2FA already shows "Coming Soon", email/usage prefs use oRPC hooks

### Phase 2: Dead Code Cleanup

Remove duplicate and unused code.

#### 2.1 Duplicate Dashboard Pages
**Dead files (confirmed never imported by routes):**
- `packages/app/pages/dashboard/dashboard-home.tsx` (394 lines)
- `packages/app/pages/dashboard/agents-page.tsx` (~360 lines)
- `packages/app/pages/dashboard/tools-page.tsx` (~262 lines)

- [x] Grep to confirm zero imports, then delete all 3 files (~1,016 lines)
- [x] Remove any barrel exports referencing deleted files

#### 2.2 Duplicate WebSocket Hook
**Byte-for-byte identical:**
- `packages/app/features/agent-ws/hooks.ts` (351 lines)
- `packages/app/shared/api/hooks/use-agent-ws.ts` (canonical — exported via barrel)

- [x] Delete `packages/app/features/agent-ws/hooks.ts`
- [x] Update any imports to use `packages/app/shared/api/hooks/use-agent-ws.ts`

#### 2.3 Auth Console Cleanup
**Correction from review:** Auth pages already show toast notifications on errors. The `console.error` calls are supplementary logging, not the sole error handling. This is cleanup, not a bug fix.

- [x] Remove supplementary `console.error` calls in `SignInPage.tsx` (3), `ForgotPasswordPage.tsx` (2), `ResetPasswordPage.tsx` (1)
- [ ] Remove `console.error` calls in the canonical WebSocket hook (kept — legitimate for WS message parsing errors)

### Phase 3: UI Polish

#### 3.1 Usage Page — Remove Misleading Card
**File:** `packages/app/pages/dashboard/UsagePage.tsx:159-176`
**Issue:** "Usage by Agent" card shows agent names with "Active" status but no real per-agent usage data.
**Fix:** Remove the misleading card. Show only aggregate stats that have real data behind them.

- [x] Remove or simplify "Usage by Agent" card to show only data backed by real queries — `UsagePage.tsx` — renamed to "Deployed Agents" with honest description

### Phase 4: Test & CI Stability

#### 4.1 CI Stability (Priority)
**Issue:** 20 of last 30 commits are Playwright CI fixes. Fix the root cause.

- [ ] Pin Playwright version and browser binaries in CI
- [ ] Add CI caching for Playwright browsers
- [ ] Investigate flakiness root causes (test isolation? race conditions? resource constraints?)

#### 4.2 Re-enable Trivial Skipped Tests
- [ ] Re-enable `health.test.ts.skip` — requires `cloudflare:test` D1 bindings, deferred to test conversion effort
- [x] Re-enable `csrf.test.ts.skip` — security-critical, should not be skipped — **DONE**: fixed `vi.hoisted` mock pattern, all 27 tests pass

#### 4.3 Priority Test Conversion (Scope-Limited)
Convert the highest-value skipped tests from `cloudflare:test` to mock-based. Do NOT attempt all 12 files — focus on security-critical paths.

**Strategy:** Test oRPC handlers directly by injecting mock context. Prefer in-memory SQLite (via `better-sqlite3` or `sql.js`) over the string-matching `createMockD1()` for any test that exercises query logic.

- [ ] Convert `auth.test.ts.skip` (454 lines) — security-critical
- [ ] Convert `agents.test.ts.skip` (1,011 lines) — core CRUD, highest-traffic path
- [ ] File tracking issues for remaining 10 skipped test files with clear rationale

#### 4.4 E2E Test Triage
- [ ] Re-enable tool edit E2E tests — `apps/web/e2e/tool-edit.e2e.ts` (2 skips)
- [ ] Webhook E2E tests (11 skips) — re-enable after Phase 1.3 webhook rewire is complete

### Phase 5: Final Checks

#### 5.1 Security Spot-Check
- [x] Verify SSRF protection covers webhook delivery URLs (not just HTTP tool) — **FIXED**: added `isWebhookUrlSafe` to `services/webhooks.ts`, blocks private IPs, localhost, cloud metadata at delivery, create, and update time
- [x] Verify webhook tables have proper authorization checks (user can only access own workspace webhooks) — **VERIFIED**: all oRPC handlers use `requireWrite`/`requireAdmin` middleware, workspace-scoped via `context.workspaceId`

#### 5.2 Verify & Ship
- [x] Run `bun run checks` — all 6 checks pass
- [x] Run `bun run test` — all 1,832 tests pass (27 new CSRF tests re-enabled)
- [ ] Update README "Coming Soon" features list to reflect reality
- [x] Verify Tauri app is not broken by chat session fix — **VERIFIED**: "Sync Tauri Routes" check passes, Tauri shares `packages/app` code, chat fix uses standard React APIs

## Acceptance Criteria

- [ ] Chat session bug fixed — multi-turn conversations persist
- [ ] Dashboard shows real tools count (not hardcoded `'6'`)
- [ ] Webhook page functional via oRPC (no more 404s)
- [ ] Unfinished features show "Coming Soon" (not broken states)
- [ ] Dead code removed (~1,367 lines: 3 pages + 1 duplicate hook)
- [ ] `auth.test.ts.skip` and `agents.test.ts.skip` re-enabled with mock-based approach
- [ ] `csrf.test.ts.skip` re-enabled
- [ ] CI Playwright tests stable (pinned versions, cached browsers)
- [ ] `bun run checks` passes cleanly
- [ ] `bun run test` — all tests pass
- [ ] SSRF protection covers webhook delivery URLs

## Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| oRPC webhook backend has bugs not caught by tests | High | Manual E2E verification after rewire; re-enable webhook E2E tests |
| Webhook tables not migrated to production D1 | High | Check migrations before rewire; run `db:migrate:local` to verify |
| Chat session fix breaks Tauri app | Medium | Check `scripts/sync-tauri.ts` for shared code paths |
| Mock-based test conversion is harder than expected | Medium | Scope-limited to 2 files; file issues for the rest |
| Playwright CI flakiness has deeper root cause | Medium | Investigate before pinning; don't just suppress failures |

## What This Plan Deliberately Excludes

These are real issues but belong in separate follow-up work, not a finalization plan:

- **Full test suite conversion** — Only converting 2 of 12 skipped test files. The remaining 10 (~6,500 lines) need their own plan.
- **Tool creation schema editor** — Current `{ type: 'object' }` works. Improve when users need it.
- **Per-agent usage analytics** — Requires new queries and backend work. Remove misleading UI instead.
- **Performance audit** — No production traffic data to optimize against yet.
- **Comprehensive security audit** — Only spot-checking webhook SSRF. Full audit is a separate effort.

## Future: Elysia + Eden Migration (Post-Finalization)

The codebase currently has a **dual routing architecture** — Hono routes (`packages/api/src/routes/`) and oRPC routers (`packages/api/src/orpc/routers/`). This creates confusion about which layer is canonical and leads to bugs like the webhook UI calling non-existent Hono endpoints when the backend lives in oRPC.

**Elysia + Eden Treaty** could resolve this by replacing both Hono and oRPC with a single framework that provides end-to-end type safety out of the box.

### Why Elysia Makes Sense for Hare

1. **Resolves the dual-routing problem** — One framework replaces both Hono (HTTP layer) and oRPC (typed procedures). No more confusion about which layer to use.
2. **End-to-end type safety via Eden Treaty** — Server route types flow directly to the client. No code generation, no manual type definitions, no `as Webhook` casts. The webhook page's 8 inline fetch wrappers with manual type assertions would become fully type-safe one-liners.
3. **First-class Cloudflare Workers support** — `CloudflareAdapter` with AoT compilation, direct access to CF bindings (`env.DB`, `env.KV`, `env.R2`, `env.AI`) via `import { env } from 'cloudflare:workers'`.
4. **Official Hono migration guide** — Elysia docs include a dedicated [from-hono migration guide](https://elysiajs.com/migrate/from-hono) with side-by-side comparisons.
5. **Bun-native** — Hare already uses Bun as its runtime. Elysia is built for Bun and leverages its performance characteristics.
6. **Validation built-in** — Uses TypeBox (`t.Object`, `t.String`) instead of Zod. Schemas serve double duty as runtime validation AND type inference. No separate `zValidator` middleware needed.

### What the Migration Looks Like

**Before (Hono + oRPC + Zod):**
```ts
// Hono route
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()
  .post('/agents', zValidator('json', z.object({ name: z.string() })), async (c) => {
    const { name } = c.req.valid('json')
    return c.json({ agent: await createAgent(name) })
  })

// Client (manual fetch, manual types)
const res = await fetch('/api/agents', { method: 'POST', body: JSON.stringify({ name }) })
const data = await res.json() as { agent: Agent } // manual cast, no safety
```

**After (Elysia + Eden Treaty):**
```ts
// Elysia route
import { Elysia, t } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'

const app = new Elysia({ adapter: CloudflareAdapter })
  .post('/agents', ({ body }) => createAgent(body.name), {
    body: t.Object({ name: t.String() })
  })
  .compile()

export type App = typeof app

// Client (fully type-safe, zero manual types)
import { treaty } from '@elysiajs/eden'
const api = treaty<App>('/api')
const { data, error } = await api.agents.post({ name: 'My Agent' })
// data is fully typed, error is narrowed by status code
```

### Eden + TanStack Query Integration

Eden Treaty returns `{ data, error, status }` which maps cleanly to TanStack Query patterns:

```ts
const { data } = useQuery({
  queryKey: ['agents'],
  queryFn: () => api.agents.get().then(({ data }) => data)
})
```

### Migration Strategy (Incremental)

1. **Install Elysia + Eden** alongside existing Hono/oRPC
2. **Migrate one router at a time** — start with a simple one (e.g., health check, dev routes)
3. **Create Eden client** and use it in new/refactored pages
4. **Migrate oRPC routers to Elysia routes** — the logic stays the same, just the framework wrapper changes
5. **Remove Hono routes** as they become redundant
6. **Remove oRPC** once all routers are migrated
7. **Delete Zod** and `@hono/zod-validator` — TypeBox handles validation

### Migration Risks

| Risk | Mitigation |
|------|------------|
| Elysia CF Workers adapter is newer than Hono's | Test thoroughly with `bun run preview` (Miniflare) before deploying |
| TypeBox vs Zod — different validation semantics | TypeBox and Zod are largely equivalent for this codebase's schemas. Migrate schemas incrementally. |
| Eden Treaty requires exporting `typeof app` | Structure the app export cleanly from the start |
| Better Auth middleware compatibility | Elysia has its own middleware system; verify Better Auth adapter exists or use `app.mount()` for the auth routes |
| Vercel AI SDK streaming compatibility | Elysia supports Web Standard Response; AI SDK streaming should work unchanged |

### Scope Estimate

- **Small** — 18 oRPC routers + 10 Hono route files to migrate
- **Low risk** — Elysia uses the same Web Standard Request/Response API as Hono
- **Incremental** — Can run both frameworks side-by-side during migration
- **Payoff** — Eliminates the dual-routing architecture permanently, removes ~3 dependencies (hono, oRPC, @hono/zod-validator)

## Sources & References

### Internal References
- `CLAUDE.md` — Development conventions and patterns
- `BLOCKING.md` — E2E testing status
- `TESTING.md` — Test infrastructure guide
- `packages/app/shared/api/hooks/use-chat.ts:117` — Chat session stale closure
- `packages/app/pages/dashboard/DashboardPage.tsx:106` — Hardcoded stats
- `packages/app/pages/agents/AgentWebhooksPage.tsx:127-268` — Raw fetch calls to non-existent Hono routes
- `packages/api/src/orpc/routers/webhooks.ts` — Existing webhook oRPC backend (549 lines)
- `packages/api/src/orpc/routers/analytics.ts` — Existing analytics oRPC backend
- Git commit `68999c8` — Explains why D1 integration tests were skipped

### Review Feedback Incorporated
- Architecture review: identified Hono/oRPC duality, webhook SSRF risk, Tauri app risk
- Simplicity review: cut scope from ~50 items to ~25, eliminated feature-building from finalization
- TypeScript review: corrected chat fix approach (use function body), corrected auth error diagnosis (toasts exist), confirmed webhook backend exists in oRPC
