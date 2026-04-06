---
status: pending
priority: p2
issue_id: "015"
tags: [code-review, data-integrity, typescript]
dependencies: []
---

# Workflow Raw SQL Uses snake_case but Drizzle Schema Uses camelCase

## Problem Statement

The DocumentIngestionWorkflow's Step 5 uses raw SQL with snake_case column names (`indexing_status`, `chunk_count`, `updated_at`), but the Drizzle schema defines camelCase column names (`indexingStatus`, `chunkCount`, `updatedAt`). The SQL column names in D1 are whatever is passed to `text('columnName')` — which is camelCase in this codebase. The raw SQL will fail at runtime.

## Findings

- Plan line 889: `UPDATE documents SET indexing_status = ?` — snake_case
- Plan line 169: `indexingStatus: text('indexingStatus')` — camelCase in SQL
- D1 column name is literally `indexingStatus`, not `indexing_status`
- This will silently fail (0 rows updated) or throw column-not-found error
- Source: TypeScript reviewer verification agent

## Proposed Solutions

### Option 1: Fix SQL to Match Drizzle Column Names

```sql
UPDATE documents SET indexingStatus = ?, chunkCount = ?, updatedAt = ? WHERE id = ? AND workspaceId = ?
```

**Effort:** Trivial
**Risk:** None

### Option 2: Use Drizzle in Workflow (Better)

Import Drizzle in the workflow step and use typed queries instead of raw SQL.

**Effort:** Small (30 min)
**Risk:** Low

## Acceptance Criteria

- [ ] Raw SQL column names match Drizzle schema column names exactly
- [ ] Or: raw SQL replaced with Drizzle ORM queries
