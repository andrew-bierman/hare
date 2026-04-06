---
status: pending
priority: p2
issue_id: "020"
tags: [code-review, security, typescript]
dependencies: []
---

# UsageQuerySchema Accepts Invalid Dates + Numeric || 0 Fallback Bug

## Problem Statement

Two related input validation issues in the usage/analytics query path:

1. `UsageQuerySchema` at `packages/api/src/schemas/usage.ts:8-9` accepts any string for dates (`z.string().optional()`). Malformed dates like `"constructor"` are passed to `new Date()` producing `Invalid Date`.

2. Throughout `packages/api/src/orpc/routers/usage.ts`, numeric fallbacks use `|| 0` which treats `0` as falsy. If a query returns exactly 0, `0 || someDefault` would produce the wrong result.

## Findings

- **Date validation:** Lines 8-9 of `schemas/usage.ts` -- no `.datetime()` or regex
- **Callers:** `usage.ts:38-41`, `analytics.ts:105-109` pass to `new Date(startDate)`
- **Numeric fallback:** Lines 87-89 of `usage.ts` use `totals?.totalMessages || 0`
- **Impact:** `0 || 0` works by accident but `0 || 'default'` would be wrong. This is fragile.

## Proposed Solutions

### Fix Both (Recommended)

```ts
// schemas/usage.ts
startDate: z.string().datetime().optional(),
endDate: z.string().datetime().optional(),

// usage.ts -- replace all || 0 with ?? 0
totalMessages: totals?.totalMessages ?? 0,
totalTokensIn: totals?.totalTokensIn ?? 0,
```

- **Effort:** Small (schema change + find/replace)
- **Risk:** Low -- `z.string().datetime()` may reject some currently-accepted inputs

## Acceptance Criteria

- [ ] `UsageQuerySchema` uses `z.string().datetime().optional()` for dates
- [ ] All `|| 0` in usage.ts and analytics.ts replaced with `?? 0`
- [ ] Tests with malformed dates verify 400 response

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-05 | Created from TypeScript + security reviews | || 0 is a common JS footgun with numeric values |
