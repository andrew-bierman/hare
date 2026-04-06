---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, security]
dependencies: []
---

# AI Gateway Cache Cross-Tenant Data Leakage Risk

## Problem Statement

The plan uses a single global AI Gateway (`hare-gateway`) across all workspaces. AI Gateway caches by model + input hash. Two users from different workspaces asking the same question would get the same cached response — potentially leaking PII from workspace A to workspace B.

## Findings

- Single gateway `hare-gateway` shared across all workspaces
- Cache keys are model + prompt hash — no workspace discrimination
- Chat completions with PII could be cached and served cross-tenant
- Embedding calls are safe to cache (deterministic, no PII typically)
- Source: Security sentinel agent

## Proposed Solutions

### Option 1: Disable Cache for Chat, Enable for Embeddings (Recommended)

**Approach:** Set `skipCache: true` for all chat/inference calls. Only enable caching for embedding calls (deterministic, no user PII).

**Effort:** Small (30 min)
**Risk:** Low

### Option 2: Include Workspace ID in Cache Key

**Approach:** If AI Gateway supports custom cache key dimensions, include workspaceId. Otherwise, create per-workspace gateways.

**Effort:** Medium-Large
**Risk:** Medium (may not be supported by AI Gateway)

## Acceptance Criteria

- [ ] Chat completions are not cached across workspaces
- [ ] Embedding calls are cached (safe, deterministic)
- [ ] No cross-tenant data leakage via cache
