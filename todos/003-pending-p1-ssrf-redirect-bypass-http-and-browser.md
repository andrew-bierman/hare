---
status: done
priority: p1
issue_id: "003"
tags: [code-review, security]
dependencies: []
---

# SSRF Redirect Bypass in HTTP Tool and Planned Browser Tool

## Problem Statement

The existing HTTP tool (`packages/tools/src/http.ts`) validates URLs before `fetch()` but does NOT validate redirect destinations. `fetch()` follows redirects by default. An attacker can redirect from a public URL to `http://169.254.169.254/latest/meta-data/` or `http://127.0.0.1:8080/internal-api`. The planned browser rendering tool has the same vulnerability pattern.

Additionally, the HTTP tool is missing decimal/hex IP bypass protection that the webhook SSRF protection already has.

## Findings

- **HTTP tool** (`packages/tools/src/http.ts:235`): `fetch(params.url, requestInit)` follows redirects with no post-redirect validation
- **HTTP tool** (`packages/tools/src/http.ts:108`): `isBlockedHost()` does NOT check decimal (2130706433 = 127.0.0.1) or hex (0x7f000001) IP encodings
- **Webhook SSRF** (`packages/api/src/services/webhooks.ts`): Has proper decimal/hex protection (tested in `webhook-ssrf.test.ts`)
- **Duplicated SSRF logic**: Two separate implementations that diverge in coverage
- **Browser SSRF vectors**: Redirect chains, JavaScript navigation, meta refresh, sub-resource loading, DNS rebinding

## Proposed Solutions

### Option 1: Consolidate SSRF Protection + Fix Redirect Handling (Recommended)

**Approach:**
1. Extract shared SSRF module to `packages/tools/src/security/ssrf.ts`
2. Merge best of both implementations (webhook's decimal/hex protection + http's URL parsing)
3. HTTP tool: set `redirect: 'manual'`, validate each redirect hop
4. Browser tool: use Puppeteer `page.setRequestInterception(true)` to validate ALL requests
5. Add DNS pre-resolution via Cloudflare DoH for rebinding prevention

**Pros:** Single source of truth, comprehensive protection, fixes existing bug AND prevents future ones
**Cons:** Larger refactor touching multiple files
**Effort:** Medium (3-4 hours)
**Risk:** Low (additive security, doesn't change functional behavior)

### Option 2: Minimal Fix — Redirect Only

**Approach:** Add `redirect: 'manual'` to HTTP tool's fetch and validate redirect destinations.

**Pros:** Smallest change
**Cons:** Doesn't fix decimal/hex bypass, doesn't consolidate SSRF logic
**Effort:** Small (1 hour)
**Risk:** Low

## Recommended Action

Option 1 — consolidate SSRF protection. The browser SSRF research provides a complete implementation.

## Technical Details

**Affected files:**
- `packages/tools/src/http.ts:209-211,235` — URL validation and fetch call
- `packages/api/src/services/webhooks.ts` — duplicate SSRF logic (better coverage)
- New: `packages/tools/src/security/ssrf.ts` — consolidated module
- New: `packages/tools/src/security/dns-resolve.ts` — DNS pre-resolution

## Acceptance Criteria

- [ ] HTTP tool validates redirect destinations (each hop)
- [ ] HTTP tool blocks decimal/hex IP encodings (matching webhook tests)
- [ ] Single SSRF module shared by HTTP tool, webhook service, and browser tool
- [ ] Browser tool uses request interception for ALL navigation requests
- [ ] Post-navigation URL check for browser tool
- [ ] DNS pre-resolution via DoH for browser tool
- [ ] Tests: redirect chain public→private blocked, decimal IP blocked, hex IP blocked

## Work Log

### 2026-04-04 - Discovery

**By:** Claude Code (Security sentinel + Browser SSRF researcher agents)

**Actions:**
- Identified redirect bypass in HTTP tool
- Identified missing decimal/hex IP protection (present in webhooks, missing in HTTP tool)
- Identified duplicated SSRF code between http.ts and webhooks.ts
- Complete browser SSRF defense-in-depth implementation researched
