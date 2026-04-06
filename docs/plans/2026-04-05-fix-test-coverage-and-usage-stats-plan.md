---
title: "fix: Test Coverage Audit & Usage Stats Fix"
type: fix
status: active
date: 2026-04-05
---

## Enhancement Summary

**Deepened on:** 2026-04-05
**Research agents used:** 12 (AI SDK docs, CF Workers Vitest, architecture strategist, TypeScript reviewer, security sentinel, performance oracle, data integrity guardian, pattern recognition, code simplicity, agent-native reviewer, SpecFlow analyzer, learnings researcher)

### Key Improvements from Research
1. **AI SDK v5.0 renamed token properties** -- plan's code examples corrected (`promptTokens` → `inputTokens`, `completionTokens` → `outputTokens`)
2. **4 additional untracked interaction paths discovered** -- HareAgent HTTP chat, MCP agent, tool execution (WS + HTTP)
3. **`waitUntil()` upgraded from suggestion to hard requirement** -- usage inserts must never block streaming
4. **Critical schema drift enumerated** -- 4 missing tables, wrong columns, missing foreign keys in test setup.ts
5. **CSRF bypassed on all oRPC routes** -- security finding requiring test coverage
6. **Analytics queries should use `Promise.all()`** -- 40-70% latency reduction on usage/analytics endpoints
7. **Workers AI may return 0 tokens in streaming** -- fallback to estimation needed
8. **90% coverage thresholds will break CI** -- need incremental ramping from 40%

### New Considerations Discovered
- Cost calculation (Phase 1c) is scope creep -- deferred to separate plan
- Phase 3 tests are integration tests, not unit tests -- naming corrected per TESTING.md convention
- `@hare/testing` package exists but is unused -- new tests should be the first consumers
- Existing comprehensive E2E plan at `docs/plans/2026-04-04-feat-comprehensive-e2e-testing-plan.md`
- CI Playwright infrastructure issues documented in `docs/plans/ci-playwright-fixes.md`

---

# fix: Test Coverage Audit & Usage Stats Fix

## Overview

Hare has significant test coverage gaps and broken usage statistics. Only 27% of source files have corresponding tests (51/188), all 9 route integration tests are skipped (`.test.ts.skip`), and the usage tracking system records inaccurate token counts across only 2 of 7 interaction paths. This plan addresses both issues systematically.

## Problem Statement / Motivation

Two critical problems compound each other:

1. **Usage stats are broken** -- Token counts are estimated via `Math.ceil(content.length / 4)` instead of using actual AI SDK usage data. Only 2 of 7 agent interaction paths record usage at all. The HareAgent Durable Object (both WebSocket and HTTP chat paths), MCP agent, and tool execution paths are completely untracked.

2. **Test coverage is dangerously low** -- 18 oRPC routers have zero tests. All route integration tests are skipped. Critical services like billing-usage, webhooks, and deployment have no tests. The 90% coverage threshold in `vitest.config.ts` is aspirational -- actual file-level coverage is 27%. Without tests, bugs like broken usage tracking go undetected.

## Proposed Solution

### Phase 1: Fix Usage Stats (Critical Bug)

Fix the broken usage tracking pipeline so accurate data flows from AI interactions to the dashboard.

#### 1a. Create shared `recordUsage()` helper

**Location:** `packages/api/src/services/usage-recording.ts` (new file)

Design the helper upfront since there are 5+ insertion sites. Signature:

```ts
import type { Database } from '@hare/db'

// Define usage type enum to prevent string drift
export const USAGE_TYPES = ['chat', 'embed', 'websocket', 'mcp_tool', 'tool_execution'] as const
export type UsageType = (typeof USAGE_TYPES)[number]

interface RecordUsageOptions {
  db: Database
  workspaceId: string
  agentId: string
  userId: string | null
  type: UsageType
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  metadata?: { model?: string; duration?: number; endpoint?: string; statusCode?: number }
}

export async function recordUsage(options: RecordUsageOptions): Promise<void> {
  const { db, workspaceId, agentId, userId, type, usage: tokenUsage, metadata } = options

  // Guard against NaN/Infinity from providers that don't report usage
  const inputTokens = Number.isFinite(tokenUsage.inputTokens) ? tokenUsage.inputTokens : 0
  const outputTokens = Number.isFinite(tokenUsage.outputTokens) ? tokenUsage.outputTokens : 0
  const totalTokens = inputTokens + outputTokens  // Always compute internally

  try {
    await db.insert(usage).values({
      workspaceId, agentId, userId, type,
      inputTokens, outputTokens, totalTokens,
      cost: 0,  // Cost calculation deferred to separate plan
      metadata,
    })
  } catch (err) {
    console.error('Usage insert failed, data lost:', err)
    // TODO: Write to KV dead-letter for reconciliation
  }
}
```

### Research Insights (AI SDK Docs)

**AI SDK v5.0 Breaking Change:** Token properties were renamed:
- `promptTokens` → `inputTokens`
- `completionTokens` → `outputTokens`
- `totalTokens` remains the same (now required)

The `streamText()` result exposes `.usage` as a Promise resolving to `{ inputTokens, outputTokens, totalTokens }`.

**Workers AI Gotcha:** Not all Workers AI models reliably report `usage` in streaming SSE responses. The `workers-ai-provider@3.0.2` defaults to `{ total: 0 }` if no usage chunk arrives. The helper's `Number.isFinite()` guards handle this, falling back to 0.

**Two methods to capture usage:**
```ts
// Method 1: await result.usage (after stream consumed)
const tokenUsage = await result.usage

// Method 2: onFinish callback
streamText({ ..., onFinish({ usage }) { /* usage available here */ } })
```

**References:**
- [AI SDK v5.0 Migration Guide](https://github.com/vercel/ai/blob/main/content/docs/08-migration-guides/26-migration-guide-5-0.mdx)
- [AI SDK streamText docs](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [Cloudflare Workers AI + AI SDK](https://developers.cloudflare.com/workers-ai/configuration/ai-sdk/)

#### 1b. Fix token counts in HTTP streaming paths

**Files:** `packages/api/src/orpc/routers/chat.ts:234-254`, `packages/api/src/orpc/routers/embed.ts:238-258`

Replace character estimation with actual AI SDK usage. **Must use `waitUntil()` for non-blocking insert:**

```ts
// After stream completes, get REAL usage from AI SDK
const tokenUsage = await result.usage  // { inputTokens, outputTokens, totalTokens }

// Yield completion BEFORE usage insert
yield { type: 'done' as const, sessionId: conversationId }

// Non-blocking: fire-and-forget via waitUntil
context.executionCtx.waitUntil(
  recordUsage({
    db, workspaceId: agentConfig.workspaceId, agentId,
    userId: user.id, type: 'chat',
    usage: tokenUsage,
    metadata: { model: agentConfig.model, duration: latencyMs },
  })
)
```

### Research Insights (Performance)

**`waitUntil()` is a hard requirement, not optional.** The current code blocks the streaming response on a D1 write. Under load, D1 write contention increases latency. If the insert throws, it crashes the stream despite the AI response being complete. `waitUntil()` is the Cloudflare Workers pattern for exactly this use case -- it decouples observability writes from user-facing latency.

**References:**
- [Cloudflare Workers waitUntil](https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil)

#### 1c. Add usage tracking to ALL HareAgent Durable Object paths

**File:** `packages/agent/src/hare-agent.ts`

The DO has **two** chat code paths that both need usage tracking:

| Method | Lines | Purpose |
|--------|-------|---------|
| `handleChat` | 434-497 | WebSocket streaming chat |
| `handleChatHTTP` | 503-582 | HTTP SSE streaming chat |

Both consume the `streamText` result independently and neither persists usage.

**Approach:** After the stream loop completes in each method, call `recordUsage()`. The DO has `this.env.DB` available but as a raw `D1Database`, not a Drizzle instance. Construct a Drizzle instance:

```ts
import { drizzle } from 'drizzle-orm/d1'

// In handleChat/handleChatHTTP, after stream completes:
const db = drizzle(this.env.DB)
this.ctx.waitUntil(
  recordUsage({
    db, workspaceId: this.state.workspaceId, agentId: this.state.agentId,
    userId, type: 'websocket',
    usage: await result.usage,
    metadata: { model: this.state.model, duration: latencyMs },
  })
)
```

### Research Insights (Architecture)

**Direct D1 from DO is the correct approach.** An API callback would add latency, create circular dependencies, and introduce a failure mode where the API is down but the DO is running. The `@hare/agent` → `@hare/db` dependency is a natural downward dependency (the agent already transitively depends on DB types through `@hare/tools`).

**Import `StepResult` from AI SDK** instead of the hand-rolled type at line 418:
```ts
import type { StepResult } from 'ai'
// Replace: (step: { toolCalls?: unknown[]; usage?: { totalTokens?: number } })
// With proper StepResult type that includes inputTokens/outputTokens
```

**`HareAgentEnv.DB` is optional** (`DB?: D1Database`). Add a runtime guard:
```ts
if (!this.env.DB) {
  console.error('DB binding unavailable in HareAgent, usage not recorded')
  return
}
```

#### 1d. Add usage tracking to MCP agent and tool execution paths

**Files:**
- `packages/agent/src/mcp-agent.ts:103-127` -- MCP tool execution (external AI clients)
- `packages/agent/src/hare-agent.ts:640-661` -- HTTP tool execution
- `packages/agent/src/hare-agent.ts:666-706` -- WebSocket tool execution

### Research Insights (Agent-Native)

**Agent-native parity audit found 4 untracked paths.** Only 3 of 7 interaction paths were in the original plan:

| Path | Status | Type |
|------|--------|------|
| HTTP streaming chat (oRPC) | In plan (1b) | `'chat'` |
| Embed widget chat (oRPC) | In plan (1b) | `'embed'` |
| WebSocket DO chat | In plan (1c) | `'websocket'` |
| HTTP DO chat | **NEW** (1c) | `'websocket'` |
| MCP tool execution | **NEW** (1d) | `'mcp_tool'` |
| Tool execution via WS | **NEW** (1d) | `'tool_execution'` |
| Tool execution via HTTP | **NEW** (1d) | `'tool_execution'` |

### Phase 2: Fix Test Infrastructure

Before adding any new tests, fix the root cause of test fragility.

#### 2a. Replace hardcoded SQL in setup.ts with Drizzle-generated migrations

**File:** `packages/api/src/routes/__tests__/setup.ts`

### Research Insights (Data Integrity)

The hardcoded SQL has **critical schema drift**:

**Missing tables (4):**
- `activity_events` (from `activity-events.ts`)
- `audit_logs` (from `audit-logs.ts`)
- `agent_versions` (from `agent-versions.ts`)
- `webhook_deliveries` (from `webhook-deliveries.ts`)

**Wrong columns:**
- `api_keys` has plaintext `key` column in test SQL but NOT in production (security hazard)
- `conversations` missing `workspaceId` column (required NOT NULL in prod)
- `agents` has `DEFAULT 'llama-3.3-70b'` for model but prod requires explicit value
- `webhook_logs` has `DEFAULT 0` for attempts but prod uses `DEFAULT 1` (off-by-one)
- `user_preferences` missing `tourCompleted` column

**Missing foreign keys:** Only `agent_tools` has FK constraints. All other tables lack cascade behavior, meaning tests won't catch orphaned record bugs.

**Fix:** Generate setup SQL from Drizzle schema instead of maintaining by hand:
```bash
# Option A: Use drizzle-kit generate output
bunx drizzle-kit generate --config=drizzle.config.ts

# Option B: Programmatic migration in setup.ts
import { migrate } from 'drizzle-orm/d1/migrator'
export async function applyMigrations(db: D1Database) {
  const drizzleDb = drizzle(db)
  await migrate(drizzleDb, { migrationsFolder: './drizzle' })
}
```

#### 2b. Unskip route integration tests

**Files:** `packages/api/src/routes/__tests__/*.test.ts.skip` (9 files)

After fixing setup.ts, rename `.skip` files and run. Fix remaining failures.

#### 2c. Lower coverage thresholds for CI

### Research Insights (Performance / CI)

The 90% coverage thresholds at `vitest.config.ts:99-102` will immediately fail CI at 27% actual coverage. Ramp incrementally:

```ts
// Start realistic, increment as coverage improves
lines: 40,      // Current: ~27%, target ramp: 40 → 60 → 75 → 90
functions: 40,
branches: 40,
statements: 40,
```

### Phase 3: Integration Tests for Usage-Related Routers

> **Naming note:** Per `TESTING.md` convention, these are **integration tests** (`*.integration.test.ts`), not unit tests -- they run against real D1 via the Cloudflare Workers Vitest pool.

Focus on routers that validate the usage fix:

| Router | File | Tests Needed |
|--------|------|-------------|
| `usage` | `routers/usage.ts` | Workspace usage aggregation, agent usage, date filtering, empty state |
| `analytics` | `routers/analytics.ts` | Summary stats, time-series grouping (day/week/month), by-agent, by-model, json_extract behavior |
| `billing` | `routers/billing.ts` | Plan status, usage limits, checkout flows |
| `chat` | `routers/chat.ts` | Streaming response, usage record creation, token accuracy |
| `embed` | `routers/embed.ts` | Public embed chat, usage with null userId |

### Research Insights (TypeScript)

**Type safety concerns for test data:**
- Import Zod schemas and use `z.infer<typeof Schema>` for test fixtures
- Test Zod schema validation directly with `.safeParse()` for edge cases
- `UsageQuerySchema` accepts invalid dates (`z.string().optional()`) -- should be `z.string().datetime().optional()`. Test with malformed dates.

**Numeric fallback bug:** Throughout `usage.ts`, `|| 0` treats `0` as falsy. Replace with `?? 0`:
```ts
// Current (fragile): totalMessages: totals?.totalMessages || 0
// Correct: totalMessages: totals?.totalMessages ?? 0
```

### Research Insights (Security)

**CSRF bypassed on ALL oRPC routes** (`packages/api/src/index.ts:97-103`). Every state-changing oRPC procedure has zero CSRF protection. Tests should verify that cross-origin requests without CSRF tokens are rejected.

**Missing workspace scoping on `getAgentUsage`** (`usage.ts:133-169`). The usage queries filter only by `agentId` without `workspaceId`. Add `eq(usage.workspaceId, workspaceId)` to all three queries. Test that usage records from other workspaces are excluded.

**`requireWrite` is too permissive** for read-only usage/analytics endpoints. Consider whether viewers should access cost/billing data.

### Research Insights (Performance)

**Parallelize independent queries with `Promise.all()`:**

Usage router (3 sequential queries → parallel):
```ts
const [totals, byAgentRaw, byDay] = await Promise.all([
  db.select({ ... }).from(usage).where(and(...conditions)),
  db.select({ ... }).from(usage).leftJoin(agents, ...).where(...).groupBy(...),
  db.select({ ... }).from(usage).where(...).groupBy(...).orderBy(...),
])
```

Analytics router (4 sequential queries → parallel, 40-70% latency reduction):
```ts
const [summary, timeSeries, byAgent, byModel] = await Promise.all([...])
```

**`json_extract` cannot be indexed in SQLite.** Consider denormalizing `model` to a top-level indexed column in the usage schema. This eliminates JSON parsing overhead across all analytics queries.

**Add composite index** `(agentId, createdAt)` for agent-scoped time-series queries.

### Research Insights (Pattern Recognition)

**Use `@hare/testing` package.** The project has a dedicated testing package with factories, mocks, and seeds that NO existing test file actually uses. New tests should be the first consumers:

```ts
import {
  createTestUser, createTestWorkspace, createTestAgent,
  seedAgent, seedCompleteEnvironment, cleanupSeededData,
  createMockEnv, resetAllFactoryCounters,
} from '@hare/testing'
```

**Existing skipped tests duplicate these helpers inline** with raw SQL inserts. When unskipping, refactor to use `@hare/testing`.

### Phase 4: Integration Tests for Billing-Usage Service

**File:** `packages/api/src/services/billing-usage.ts`

This is the most testable critical service -- pure database queries with no external dependencies. Test all 5 exported functions:

- `getActiveAgentCount()` -- counts non-archived agents
- `getMessageCount()` -- counts by type `'chat'` in period
- `getTokenUsage()` -- sums input/output/total tokens
- `getBillingUsage()` -- parallel aggregation
- `checkUsageLimits()` -- limit enforcement logic

### Research Insights (Agent-Native / SpecFlow)

**Billing limits are never enforced at request time.** `checkUsageLimits()` exists but is never called before allowing a chat. A free-tier user with 1,000 message/month limit can send unlimited messages. This is a follow-up fix but tests should verify the function works correctly.

**Embed traffic (`type: 'embed'`) is exempt from billing.** `getMessageCount` only counts `type: 'chat'`. An embedded widget could bypass billing limits. Tests should verify this behavior is intentional or flag it.

### Phase 5: E2E Test Validation

Reference the existing comprehensive E2E plan at `docs/plans/2026-04-04-feat-comprehensive-e2e-testing-plan.md` and CI fixes at `docs/plans/ci-playwright-fixes.md`.

**Current status:** 988/1001 E2E tests passing in 41 files. 855 `networkidle` waits causing flakiness.

**For this plan, focus on:**
1. Run `usage.e2e.ts` (824 lines, already exists) and verify it passes
2. Run `analytics.e2e.ts` and `billing.e2e.ts`
3. Verify usage data appears after a real chat interaction

**Defer to the existing E2E plan:**
- Replacing 855 `networkidle` waits
- Cross-device responsive testing
- Consolidating duplicate test files
- CI Playwright infrastructure fixes

## Acceptance Criteria

### Phase 1: Usage Stats Fix
- [ ] Shared `recordUsage()` helper in `services/usage-recording.ts` with `Number.isFinite()` guards
- [ ] `USAGE_TYPES` enum defined and validated at insert time
- [ ] Token counts come from AI SDK `usage` object (`inputTokens`/`outputTokens`), not character estimation
- [ ] All 7 interaction paths record usage (chat, embed, DO WS chat, DO HTTP chat, MCP, tool exec WS, tool exec HTTP)
- [ ] Usage inserts use `waitUntil()` -- never block streaming responses
- [ ] Usage insert errors are caught and logged, never crash the stream
- [ ] `HareAgent` constructs Drizzle instance from `this.env.DB` with runtime guard for missing binding

### Phase 2: Test Infrastructure
- [ ] `setup.ts` uses Drizzle-generated SQL (not handwritten) -- includes all tables, correct columns, foreign keys
- [ ] All 9 `.test.ts.skip` files renamed and passing
- [ ] Coverage thresholds lowered to 40% initially, with documented ramp plan
- [ ] Tests use `@hare/testing` factories and seeds

### Phase 3: Usage Router Integration Tests
- [ ] Usage, analytics, billing, chat, embed routers tested
- [ ] Each test covers: valid input, invalid input, auth required, date validation edge cases
- [ ] Analytics DATE/json_extract SQL verified with seeded data
- [ ] Workspace scoping verified (no cross-workspace data leakage)

### Phase 4: Billing-Usage Service Tests
- [ ] All 5 functions in `billing-usage.ts` tested
- [ ] `checkUsageLimits()` tested with exceeded/within/unlimited scenarios
- [ ] Embed vs chat type counting behavior documented and tested

### Phase 5: E2E Validation
- [ ] `usage.e2e.ts`, `analytics.e2e.ts`, `billing.e2e.ts` pass
- [ ] Usage data reflects real chat interactions

### Quality Gates
- [ ] `bun run test` passes with no skipped tests
- [ ] `bun run test:e2e` passes for usage-related tests
- [ ] `bun run checks` passes (lint, typecheck, build)

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI SDK `result.usage` returns 0 for some Workers AI models in streaming | HIGH | `Number.isFinite()` guards + fallback to 0 (not estimation). Monitor via AI Gateway dashboard |
| `this.env.DB` is optional in HareAgent env | MEDIUM | Runtime guard with error logging. Verify wrangler.toml D1 binding for DO |
| Schema drift in setup.ts breaks all integration tests | HIGH | Generate from Drizzle schema, not handwritten SQL |
| 90% coverage thresholds fail CI immediately | HIGH | Lower to 40%, ramp incrementally |
| CSRF bypassed on oRPC routes | HIGH | Out of scope for this plan but tests should flag it. Follow-up required |
| Billing limits never enforced at request time | MEDIUM | Out of scope but `checkUsageLimits()` tests verify it works when called |

## Deferred / Out of Scope

These items were identified by research agents but are out of scope:

| Item | Reason | Where to Track |
|------|--------|---------------|
| Cost calculation (model-to-price mapping) | Feature addition, not a bug fix. Workers AI pricing is per-model and complex | Separate plan |
| Billing limit enforcement at request time | Requires middleware changes beyond usage fix | Separate plan |
| CSRF protection for oRPC routes | Security fix orthogonal to usage tracking | Separate plan |
| Denormalize `model` from JSON metadata to top-level column | Schema migration for perf optimization | Separate plan |
| Testing all 18 oRPC routers | Only 5 are relevant to the usage fix | Separate test coverage plan |
| Testing deployment.ts, webhooks.ts, vector-memory.ts | Unrelated to usage tracking | Separate test coverage plan |
| E2E infrastructure fixes (networkidle, auth perf) | Already tracked in `docs/plans/ci-playwright-fixes.md` | Existing plan |
| Webhook retry redesign (setTimeout blocks Worker) | Infrastructure issue, not usage-related | Separate plan |

## Implementation Notes

### Worktree Strategy

```bash
git worktree add worktrees/fix-usage-stats -b fix/usage-stats
# Do Phase 1 + Phase 2a here, then Phase 3-5 in the same branch
```

### Running Tests

```bash
bun run test                    # All unit/integration tests
bun run test:coverage           # With coverage report
bun run test packages/api/src/routes/__tests__/usage.test.ts  # Specific file
bun run test:e2e                # E2E tests (requires dev server)
cd apps/web && bunx playwright test e2e/usage.e2e.ts  # Specific E2E
```

## Sources & References

### Internal References
- Test infrastructure: `vitest.config.ts:1-106`
- Usage schema: `packages/db/src/schema/usage.ts:7-41`
- Usage router: `packages/api/src/orpc/routers/usage.ts:24-111`
- Analytics router: `packages/api/src/orpc/routers/analytics.ts:92-220`
- Chat usage insert: `packages/api/src/orpc/routers/chat.ts:234-254`
- Embed usage insert: `packages/api/src/orpc/routers/embed.ts:238-258`
- HareAgent handleChat: `packages/agent/src/hare-agent.ts:434-497`
- HareAgent handleChatHTTP: `packages/agent/src/hare-agent.ts:503-582`
- HareAgent tool execution: `packages/agent/src/hare-agent.ts:640-706`
- MCP agent: `packages/agent/src/mcp-agent.ts:103-127`
- Billing usage service: `packages/api/src/services/billing-usage.ts:1-189`
- Skipped tests: `packages/api/src/routes/__tests__/*.test.ts.skip` (9 files)
- Test setup SQL: `packages/api/src/routes/__tests__/setup.ts:13-76`
- Testing guide: `TESTING.md`
- Testing package: `packages/testing/src/`
- E2E usage tests: `apps/web/e2e/usage.e2e.ts` (824 lines)
- CSRF bypass: `packages/api/src/index.ts:97-103`
- Existing E2E plan: `docs/plans/2026-04-04-feat-comprehensive-e2e-testing-plan.md`
- CI Playwright fixes: `docs/plans/ci-playwright-fixes.md`

### External References
- [AI SDK v5.0 Migration Guide (token rename)](https://github.com/vercel/ai/blob/main/content/docs/08-migration-guides/26-migration-guide-5-0.mdx)
- [AI SDK streamText docs](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [AI SDK Record Token Usage cookbook](https://ai-sdk.dev/cookbook/node/stream-object-record-token-usage)
- [Cloudflare Workers AI + AI SDK](https://developers.cloudflare.com/workers-ai/configuration/ai-sdk/)
- [Cloudflare Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Cloudflare Workers waitUntil](https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil)

### File Count Summary
- Source files (non-test, non-index): **188**
- Source files with tests: **51** (27%)
- Unit/integration test files: **68**
- E2E test files: **30**
- Skipped test files: **9**
- oRPC routers without tests: **18/18** (0%)
- Agent interaction paths tracked: **2/7** (current) → **7/7** (after fix)
