---
status: pending
priority: p2
issue_id: "019"
tags: [code-review, security, data-integrity]
dependencies: []
---

# getAgentUsage Queries Missing workspaceId Filter

## Problem Statement

The `getAgentUsage` handler at `packages/api/src/orpc/routers/usage.ts:130-169` verifies agent ownership but then queries usage records filtered ONLY by `agentId`, without also filtering by `workspaceId`. This is a defense-in-depth gap.

## Findings

- **Location:** `packages/api/src/orpc/routers/usage.ts` lines 133, 145, 161
- All three queries (totals, byModel, byDay) use `eq(usage.agentId, agentId)` without `eq(usage.workspaceId, workspaceId)`
- The agent ownership check (lines 127-130) mitigates the worst case, but if usage records were ever incorrectly scoped (e.g., agent transferred between workspaces), data from the wrong workspace could be returned
- **Source:** Security sentinel review

## Proposed Solutions

### Option 1: Add workspaceId to All Three Queries (Recommended)
```ts
.where(and(eq(usage.agentId, agentId), eq(usage.workspaceId, workspaceId)))
```
- **Pros:** Defense-in-depth, uses existing index `usage_workspace_created_idx`
- **Cons:** Slightly redundant with ownership check
- **Effort:** Small (3 line changes)
- **Risk:** Very low

## Acceptance Criteria

- [ ] All three queries in `getAgentUsage` include `eq(usage.workspaceId, workspaceId)`
- [ ] Integration test verifies cross-workspace data is excluded

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-05 | Created from security review | Defense-in-depth: always scope queries to workspace |
