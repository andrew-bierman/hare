---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, security, data-integrity]
dependencies: []
---

# Workflow Input Validation and Workspace Scoping Missing

## Problem Statement

The DocumentIngestionWorkflow accepts `documentId`, `workspaceId`, and `r2Key` as input parameters without validating that the document belongs to the workspace, or that the r2Key is workspace-scoped. The D1 UPDATE in step 5 also lacks workspace scoping.

## Findings

- No validation that `documentId` belongs to `workspaceId` in workflow
- Raw SQL UPDATE: `WHERE id = ?` should be `WHERE id = ? AND workspaceId = ?`
- `r2Key` input could reference another workspace's R2 path if not validated
- Timestamp uses `Date.now()` (milliseconds) but Drizzle uses seconds — will corrupt timestamps
- Source: Security sentinel + Data integrity guardian agents

## Proposed Solutions

### Option 1: Add Input Validation and Workspace Scoping (Recommended)

**Approach:** Validate inputs at workflow start. Add workspaceId to all WHERE clauses. Fix timestamp.

```ts
// Step 0: Validate document belongs to workspace
const [doc] = await this.env.DB.prepare(
  'SELECT id FROM documents WHERE id = ? AND workspace_id = ?'
).bind(event.payload.documentId, event.payload.workspaceId).all()
if (!doc) throw new Error('Document not found or access denied')

// Step 5: Workspace-scoped update with correct timestamp
await this.env.DB.prepare(
  'UPDATE documents SET indexing_status = ?, chunk_count = ?, updated_at = ? WHERE id = ? AND workspace_id = ?'
).bind('indexed', chunks.length, Math.floor(Date.now() / 1000), event.payload.documentId, event.payload.workspaceId).run()
```

**Effort:** Small (1 hour)
**Risk:** Low

## Acceptance Criteria

- [ ] Workflow validates documentId belongs to workspaceId before processing
- [ ] All D1 queries include workspace scoping
- [ ] Timestamps use seconds (Math.floor(Date.now() / 1000))
