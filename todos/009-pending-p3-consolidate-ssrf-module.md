---
status: pending
priority: p3
issue_id: "009"
tags: [code-review, architecture, security]
dependencies: ["003"]
---

# Consolidate Duplicated SSRF Protection into Shared Module

## Problem Statement

SSRF protection is duplicated between `packages/tools/src/http.ts` and `packages/api/src/services/webhooks.ts` with different coverage levels. The webhook version is more thorough (handles decimal/hex bypasses). Should be a single shared module.

## Findings

- `http.ts` SSRF: missing decimal/hex IP bypass protection
- `webhooks.ts` SSRF: has decimal/hex protection, tested in `webhook-ssrf.test.ts`
- Both implement `isPrivateIPv4`, `isPrivateIPv6` independently
- Browser tool will need the same protection — third copy if not consolidated
- Source: Browser SSRF researcher + Security sentinel agents

## Proposed Solutions

### Option 1: Extract to `packages/tools/src/security/ssrf.ts`

**Approach:** Merge best of both into shared module. Add DNS pre-resolution for browser tool.

**Effort:** Medium (2-3 hours)
**Risk:** Low

## Acceptance Criteria

- [ ] Single SSRF module at `packages/tools/src/security/ssrf.ts`
- [ ] All three consumers (HTTP tool, webhooks, browser tool) import from shared module
- [ ] Includes decimal/hex/octal IP bypass protection
- [ ] Includes DNS pre-resolution helper
- [ ] All existing webhook SSRF tests pass against shared module
