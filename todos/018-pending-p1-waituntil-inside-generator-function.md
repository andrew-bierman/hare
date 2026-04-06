---
status: pending
priority: p1
issue_id: "018"
tags: [code-review, architecture, cloudflare]
dependencies: []
---

# executionCtx Missing from oRPC BaseContext + waitUntil() Generator Concerns

## Problem Statement

**Two compounding issues:**

1. **`context.executionCtx` does not exist** in the oRPC `BaseContext`. The plan's core pattern (`context.executionCtx.waitUntil(...)`) at Phase 1b will produce a TypeScript error. The `BaseContext` interface at `packages/api/src/orpc/base.ts:18-23` only has `db`, `headers`, and `env` -- no `executionCtx`.

2. **`waitUntil()` called after final `yield` in a generator** may never execute. If the consumer closes the iterator (e.g., client disconnects), the generator is aborted before reaching code after the last `yield`. The `waitUntil()` must be registered BEFORE yielding `done`.

## Findings

- **Source:** Architecture strategist review (confirmed by reading `packages/api/src/orpc/base.ts`)
- **BaseContext interface:**
  ```ts
  export interface BaseContext {
    db: Database
    headers: Headers
    env: CloudflareEnv
    // NO executionCtx!
  }
  ```
- Hono context (`c.executionCtx`) has it, but it's not threaded through to oRPC procedures
- The DO paths (`this.ctx.waitUntil()`) are fine -- Durable Objects expose `this.ctx` natively

## Proposed Solutions

### Option 1: Add executionCtx to BaseContext (Recommended)
Thread `executionCtx` from Hono middleware into the oRPC context:

```ts
// packages/api/src/orpc/base.ts
export interface BaseContext {
  db: Database
  headers: Headers
  env: CloudflareEnv
  executionCtx: ExecutionContext  // ADD THIS
}

// In Hono-to-oRPC bridge middleware:
context: { db, headers, env, executionCtx: c.executionCtx }
```

Then register `waitUntil()` BEFORE the final yield:
```ts
// Register background task BEFORE yielding done
context.executionCtx.waitUntil(recordUsage(...))
yield { type: 'done' as const, sessionId: conversationId }
```

- **Pros:** Proper Cloudflare pattern, works in all oRPC procedures
- **Cons:** Changes BaseContext contract (all procedures get executionCtx)
- **Effort:** Small (add field + thread through)
- **Risk:** Low

### Option 2: Use streamText's onFinish Callback
Register usage insert inside `onFinish` which fires after stream completion:
```ts
streamText({
  ...,
  onFinish({ usage }) {
    // db is in closure scope, insert here
    db.insert(usage).values({ ... }).catch(console.error)
  }
})
```
- **Pros:** No generator/waitUntil concern, no BaseContext change
- **Cons:** No `waitUntil()` = insert may not complete if Worker terminates; `onFinish` runs within the request lifecycle
- **Effort:** Small
- **Risk:** Medium

### Option 3: Use env.executionCtx or pass via env
Access execution context through the CloudflareEnv bindings or a custom binding.
- **Pros:** No BaseContext change
- **Cons:** Non-standard, hacky
- **Effort:** Small
- **Risk:** Medium

## Acceptance Criteria

- [ ] `executionCtx` is accessible in oRPC procedure handlers
- [ ] `waitUntil()` is called BEFORE the final yield, not after
- [ ] Usage records actually persist (verified with test)
- [ ] No race condition where Worker terminates before insert completes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-05 | Created from architecture review | `context.executionCtx` doesn't exist in BaseContext -- plan's code won't compile |
| 2026-04-05 | Upgraded severity | This blocks the entire Phase 1b implementation |
