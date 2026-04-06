---
status: pending
priority: p1
issue_id: "016"
tags: [code-review, testing, infrastructure]
dependencies: []
---

# V8 Coverage Provider Does Not Work in Cloudflare Workers Vitest Pool

## Problem Statement

The vitest config at `vitest.config.ts:79` uses `provider: "v8"` for coverage. V8 native coverage is NOT supported in the `@cloudflare/vitest-pool-workers` because tests run inside workerd, not Node.js. This means coverage reports are inaccurate or empty, rendering the 90% thresholds meaningless.

## Findings

- **Source:** Cloudflare Workers SDK issue #5266, official docs
- **Location:** `vitest.config.ts:79`
- **Impact:** Coverage numbers are unreliable. The plan proposes lowering thresholds to 40% but this is moot if the provider itself is broken.
- **Known issue with Istanbul 4.1.0:** `@vitest/coverage-istanbul@4.1.0` crashes with `TypeError: template is not a function` (workers-sdk #12951). Pin to `@vitest/coverage-istanbul@4.0.18`.

## Proposed Solutions

### Option 1: Switch to Istanbul Provider (Recommended)
- **Pros:** Officially supported, produces accurate coverage in Workers pool
- **Cons:** Requires installing `@vitest/coverage-istanbul`, may need version pinning
- **Effort:** Small
- **Risk:** Low

```ts
// vitest.config.ts
coverage: {
  provider: "istanbul",  // NOT "v8"
  // ...rest unchanged
}
```

Install: `bun add -d @vitest/coverage-istanbul@4.0.18`

### Option 2: Keep V8 and Accept Inaccurate Coverage
- **Pros:** No changes needed
- **Cons:** Coverage reports are meaningless, defeats the purpose of thresholds
- **Effort:** None
- **Risk:** High -- false confidence in coverage

## Acceptance Criteria

- [ ] `vitest.config.ts` uses `provider: "istanbul"`
- [ ] `@vitest/coverage-istanbul` installed (pinned to working version)
- [ ] `bun run test:coverage` produces non-empty, accurate reports
- [ ] Coverage thresholds adjusted to realistic values (40% initially)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-05 | Created from technical review | V8 coverage fundamentally broken in Workers pool per CF docs |

## Resources

- [V8 Coverage Not Working - workers-sdk #5266](https://github.com/cloudflare/workers-sdk/issues/5266)
- [Istanbul Crash Bug - workers-sdk #12951](https://github.com/cloudflare/workers-sdk/issues/12951)
