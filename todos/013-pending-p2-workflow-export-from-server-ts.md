---
status: pending
priority: p2
issue_id: "013"
tags: [code-review, architecture]
dependencies: []
---

# Missing Export of DocumentIngestionWorkflow from server.ts

## Problem Statement

Cloudflare Workflows require the `WorkflowEntrypoint` class to be exported from the Worker's main module (`apps/web/src/server.ts`). The plan never adds this export. Without it, the workflow will not be registered at deploy time — a silent failure.

## Findings

- `apps/web/src/server.ts` currently exports only `HareAgent` and `HareMcpAgent`
- Plan places workflow at `apps/web/src/workflows/document-ingestion.ts` but never adds export
- Deploy will succeed but workflow binding will not resolve at runtime
- Source: Architecture strategist verification agent

## Proposed Solutions

### Option 1: Add Export to server.ts

**Approach:** Add `export { DocumentIngestionWorkflow } from './workflows/document-ingestion'` to `server.ts`.

**Effort:** Trivial (1 line)
**Risk:** None

## Acceptance Criteria

- [ ] `DocumentIngestionWorkflow` exported from `apps/web/src/server.ts`
- [ ] Workflow accessible via binding at runtime after deploy
