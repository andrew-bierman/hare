---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, performance, architecture]
dependencies: []
---

# Vectorize Pagination Ceiling at 1000 Vectors

## Problem Statement

`listMemories` and `deleteAgentMemories` in `packages/api/src/services/vector-memory.ts` cap at 1000 vectors. Document ingestion creates ~250 vectors per document. After 4 documents, this cap is silently hit — memories are lost and deletes are incomplete.

## Findings

- `listMemories` fetches `Math.min(limit + offset, 1000)` results using a dummy zero-vector query — O(n log n) in-memory sort, unstable pagination
- `deleteAgentMemories` deletes at most 1000 vectors — silently leaves orphans if agent has more
- Document ingestion will create 100-500 vectors per document, rapidly exceeding the cap
- Source: Performance oracle agent

## Proposed Solutions

### Option 1: D1 Metadata Store for Listing + Looped Deletes (Recommended)

**Approach:** Store a parallel D1 record for each vector (id, agentId, workspaceId, createdAt, content snippet). Use D1 for listing/pagination (proper SQL pagination). Use Vectorize only for semantic search. Loop deletes until zero results.

**Effort:** Medium (3-4 hours)
**Risk:** Low

### Option 2: Increase topK and Loop

**Approach:** Keep current approach but loop queries/deletes in batches of 1000.

**Effort:** Small (1 hour)
**Risk:** Medium (still unstable pagination with dummy embeddings)

## Acceptance Criteria

- [ ] `listMemories` supports proper pagination for >1000 vectors
- [ ] `deleteAgentMemories` removes ALL vectors for an agent
- [ ] Agent with 5000+ vectors can list and delete correctly
