---
status: done
priority: p1
issue_id: "002"
tags: [code-review, security]
dependencies: []
---

# MCP Authentication Bypass via optionalAuthMiddleware

## Problem Statement

The MCP routes at `packages/api/src/routes/mcp.ts` use `optionalAuthMiddleware`, meaning all MCP endpoints (including tool execution) can be accessed without any authentication. An attacker who knows a workspace ID can execute any tool and access workspace data.

## Findings

- **File:** `packages/api/src/routes/mcp.ts`, line 238: uses `optionalAuthMiddleware`
- **Lines 253-256:** Authorization check is conditional on `if (user?.id)` — if no session exists, the check is skipped entirely
- **Same pattern at lines 328, 347, 372**
- **Line 316:** `createToolContext` falls back to `userId: user?.id || 'mcp-client'` when unauthenticated
- **Impact:** Complete unauthenticated access to all MCP endpoints including all 59 system tools (KV, R2, SQL, AI, etc.)
- **Source:** Security sentinel agent, confirmed by direct code inspection

## Proposed Solutions

### Option 1: Switch to Required Auth Middleware (Quick Fix)

**Approach:** Replace `optionalAuthMiddleware` with `authMiddleware` on MCP routes. This forces session authentication.

**Pros:** Immediate fix, minimal code change
**Cons:** Breaks API key access (API keys don't create sessions)
**Effort:** Small (15 min)
**Risk:** Low, but may break existing MCP integrations using API keys

### Option 2: Implement Unified MCP Auth Middleware (Recommended)

**Approach:** Create `mcpAuthMiddleware` that accepts EITHER session auth, API key, or OAuth token. Return 401 if none provided. This is the approach detailed in the MCP OAuth research.

**Pros:** Supports all auth methods, follows MCP spec (401 triggers OAuth flow in Claude Desktop), future-proof
**Cons:** More code, requires new middleware file
**Effort:** Medium (2-3 hours)
**Risk:** Low

### Option 3: Add Explicit Rejection for Unauthenticated Requests

**Approach:** Keep `optionalAuthMiddleware` but add explicit `if (!user?.id) return c.json({ error: 'Unauthorized' }, 401)` at the start of each handler.

**Pros:** Smallest change, no middleware refactor
**Cons:** Duplicated checks, easy to miss in new handlers
**Effort:** Small (30 min)
**Risk:** Medium (fragile — new routes could forget the check)

## Recommended Action

Option 2 — implement unified MCP auth middleware. This also lays groundwork for Phase 2.4 OAuth.

## Technical Details

**Affected files:**
- `packages/api/src/routes/mcp.ts:238` — middleware assignment
- `packages/api/src/routes/mcp.ts:253,328,347,372` — conditional auth checks
- `packages/api/src/routes/mcp.ts:316` — fallback userId

**Related:** MCP OAuth research provides complete implementation for unified auth middleware at `packages/api/src/middleware/mcp-auth.ts`

## Acceptance Criteria

- [ ] No MCP endpoint accessible without valid credentials (session, API key, or OAuth token)
- [ ] 401 response returned for unauthenticated requests (triggers OAuth flow in MCP clients)
- [ ] API key auth still works for existing integrations
- [ ] Test: unauthenticated request to `/api/mcp/{workspaceId}/tools` returns 401

## Work Log

### 2026-04-04 - Discovery

**By:** Claude Code (Security sentinel agent)

**Actions:**
- Identified `optionalAuthMiddleware` usage on MCP routes
- Traced authorization bypass through conditional checks
- Confirmed impact: full unauthenticated access to all tools
- Cross-referenced with MCP OAuth best practices research
