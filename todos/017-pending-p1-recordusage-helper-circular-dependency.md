---
status: pending
priority: p1
issue_id: "017"
tags: [code-review, architecture, typescript]
dependencies: []
---

# recordUsage() Helper Location Creates Circular Dependency

## Problem Statement

The plan proposes placing `recordUsage()` in `packages/api/src/services/usage-recording.ts`. However, the HareAgent Durable Object in `packages/agent/` needs to call this helper. This creates a circular dependency: `@hare/agent` → `@hare/api` (for recordUsage) while `@hare/api` → `@hare/agent` (for agent creation/routing).

## Findings

- **Plan location:** `packages/api/src/services/usage-recording.ts` (line 54)
- **Callers in `@hare/agent`:** `hare-agent.ts` (handleChat, handleChatHTTP), `mcp-agent.ts`
- **Callers in `@hare/api`:** `chat.ts`, `embed.ts`
- The function only depends on `@hare/db` (Drizzle schema) and plain types -- it does NOT need anything from `@hare/api`

## Proposed Solutions

### Option 1: Move to `@hare/db` Package (Recommended)
- **Location:** `packages/db/src/services/usage-recording.ts`
- **Pros:** Both `@hare/agent` and `@hare/api` already depend on `@hare/db`. No new dependencies. The function only uses the Drizzle schema, which is in `@hare/db`.
- **Cons:** Slightly muddies `@hare/db` as a "schema-only" package
- **Effort:** Small
- **Risk:** Low

### Option 2: Create a New `@hare/usage` Package
- **Pros:** Clean separation, no muddying existing packages
- **Cons:** Over-engineered for a single function. Package proliferation.
- **Effort:** Medium
- **Risk:** Low

### Option 3: Duplicate in Both Packages
- **Pros:** No dependency issues
- **Cons:** Violates DRY, the exact problem the helper is meant to solve
- **Effort:** Small
- **Risk:** High (drift between copies)

## Acceptance Criteria

- [ ] `recordUsage()` is importable by both `@hare/agent` and `@hare/api` without circular deps
- [ ] No new inter-package dependency cycles introduced
- [ ] Both HTTP and DO paths use the same shared function

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-05 | Created from architecture review | Plan's proposed location would create @hare/agent → @hare/api circular dependency |
