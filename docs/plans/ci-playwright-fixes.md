# CI Playwright Flakiness - Root Cause Analysis & Fixes

## Summary

3 critical issues causing CI E2E test failures. None are flaky test logic — all are infrastructure problems.

## Critical Issue #1: Playwright Browser Installation Version Mismatch

`bunx playwright@1.57.0 install chromium` installs browsers via a transient copy that may differ from the `@playwright/test` version in `node_modules`. The test runner then looks for browser binaries at a version-keyed path that doesn't exist.

**Fix** in `.github/workflows/ci.yml`:
```yaml
# Replace:
- run: bunx playwright@1.57.0 install chromium
# With:
- run: cd apps/web && npx playwright install --with-deps chromium
```

## Critical Issue #2: E2E Wrangler Config Strips All Database Bindings

`apps/web/wrangler.e2e.jsonc` sets `d1_databases: []`, meaning the dev server starts with **no database**. Every authenticated test fails because sign-up needs D1.

**Fix** in `wrangler.e2e.jsonc`:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "hare-e2e-db",
    "database_id": "e2e-local-id"
  }
]
```

And in CI workflow:
```yaml
- name: Setup E2E database
  working-directory: apps/web
  run: bun run db:migrate:local
```

## Critical Issue #3: Per-Test UI Auth is Extremely Slow

749 tests use `authenticatedPage` fixture which does full UI sign-up (typing fields with `pressSequentially` at 20ms/char). Each auth setup takes 8-12 seconds. Sequentially with 1 worker = 1.5-2.5 hours just on auth.

**Fix:** Use API-based auth with `storageState` persistence:
- Use existing `createTestUser`/`signInTestUser` API helpers in `fixtures.ts` (lines 174-219)
- Or create a Playwright setup project that authenticates once and saves storage state

## Optimization: Replace networkidle Waits

855 `networkidle` waits across the test suite. Each adds minimum 500ms of dead time. Replace with targeted element waits.

## Priority Order

1. **[BLOCKING]** Fix Playwright browser installation
2. **[BLOCKING]** Add D1 database binding to E2E wrangler config
3. **[HIGH]** Replace UI-based auth with API-based auth
4. **[MEDIUM]** Replace `networkidle` with element-based waits
5. **[MEDIUM]** Enable parallel test execution with per-worker DB isolation
6. **[LOW]** Replace `pressSequentially` delay:20 with `page.fill()`
