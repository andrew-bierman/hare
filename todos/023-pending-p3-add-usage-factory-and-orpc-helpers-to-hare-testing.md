---
status: pending
priority: p3
issue_id: "023"
tags: [code-review, testing, quality]
dependencies: ["021"]
---

# Add Usage Factory and oRPC Test Helpers to @hare/testing

## Problem Statement

The `@hare/testing` package has factories, mocks, and seeds but is unused by any test file. The skipped route tests duplicate helpers inline (~80 lines each). New tests should be the first consumers of `@hare/testing` and contribute missing utilities back.

## Findings

**Missing from `@hare/testing`:**
- `createTestUsageRecord` factory (needed for Phases 3-4)
- `orpcRequest()` helper for oRPC protocol format `{ json: ..., meta: [] }`
- `parseOrpcResponse<T>()` helper to unwrap oRPC responses
- `createAuthenticatedSession()` helper using direct D1 session seeding (Strategy B from CF Vitest research)

**Existing unused utilities:**
- `seedWorkspace()`, `seedAgent()`, `seedCompleteEnvironment()`
- `createMockEnv()`, `createMockKV()`, `createMockR2()`
- `resetAllFactoryCounters()`, `cleanupSeededData()`

**Source:** Pattern recognition specialist

## Proposed Solutions

### Option 1: Add Missing Utilities to @hare/testing (Recommended)
- **Effort:** Medium
- **Risk:** Low

## Acceptance Criteria

- [ ] `createTestUsageRecord` factory exists in `packages/testing/src/factories/`
- [ ] `orpcRequest()` and `parseOrpcResponse()` in `packages/testing/src/helpers/`
- [ ] New integration tests import from `@hare/testing` instead of defining inline helpers

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-05 | Created from pattern recognition review | @hare/testing exists but has zero consumers |
