---
status: pending
priority: p2
issue_id: "021"
tags: [code-review, testing, data-integrity]
dependencies: []
---

# Replace Raw SQL in Test setup.ts with Drizzle-Generated Migrations

## Problem Statement

`packages/api/src/routes/__tests__/setup.ts` maintains 76 lines of handwritten CREATE TABLE SQL that has drifted critically from the actual Drizzle schema. This is almost certainly why all 9 route integration tests are skipped.

## Findings

**Missing tables (4):** `activity_events`, `audit_logs`, `agent_versions`, `webhook_deliveries`

**Wrong columns:**
- `api_keys` has plaintext `key` column (security hazard -- not in prod)
- `conversations` missing `workspaceId` (required NOT NULL in prod)
- `agents.model` has `DEFAULT 'llama-3.3-70b'` (prod requires explicit value)
- `webhook_logs.attempts` defaults to 0 (prod defaults to 1)
- `user_preferences` missing `tourCompleted`

**Missing foreign keys:** Only `agent_tools` has FK constraints. No cascade behavior tested.

**Source:** Data integrity guardian, architecture strategist

## Proposed Solutions

### Option 1: Use readD1Migrations + applyD1Migrations (Recommended)
Use Cloudflare's official test migration APIs with Drizzle-generated SQL files:

```ts
// vitest.config.ts - add to miniflare bindings
TEST_MIGRATIONS: await readD1Migrations("./packages/db/migrations")

// test/apply-migrations.ts (setup file)
import { applyD1Migrations, env } from "cloudflare:test"
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
```

- **Pros:** Schema always matches prod, idempotent, official API
- **Cons:** Requires Drizzle migration files to exist
- **Effort:** Medium
- **Risk:** Low

### Option 2: Generate setup.ts from Drizzle Schema
Script that reads schema and outputs SQL. Run as pre-test step.
- **Pros:** Keeps current approach, adds automation
- **Cons:** Still a secondary source of truth
- **Effort:** Medium
- **Risk:** Medium

## Acceptance Criteria

- [ ] Test database schema matches production exactly
- [ ] All tables, columns, foreign keys, and defaults are correct
- [ ] Unskipping `.test.ts.skip` files results in passing tests

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-05 | Created from data integrity + CF Vitest research | Cloudflare provides readD1Migrations/applyD1Migrations for this exact purpose |
