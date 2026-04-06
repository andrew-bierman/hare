---
status: pending
priority: p2
issue_id: "022"
tags: [code-review, quality]
dependencies: []
---

# Plan Research Insights Sections Have ~60% Noise

## Problem Statement

The deepened plan at `docs/plans/2026-04-05-fix-test-coverage-and-usage-stats-plan.md` grew to 510 lines. The simplicity reviewer found ~60% of Research Insights content is noise for implementers -- showing alternatives not taken, justifying decisions already made, or discussing deferred items inline.

## Findings

**Should cut or collapse:**
- "Two methods to capture usage" (lines 109-115) -- plan already chose Method 1
- Architecture justification for direct D1 (lines 185-186) -- already decided
- Performance `Promise.all()` details (lines 322-335) -- deferred work presented as in-scope
- Security CSRF/permission discussion (lines 310-316) -- already in Deferred table
- Billing enforcement discussion (lines 367-371) -- already deferred
- Phase 5 (lines 373-388) -- can be 3 lines

**Items in Research Insights NOT in Deferred table:**
- `Promise.all()` parallelization, composite index, `StepResult` import, `|| 0` fix, date validation, workspace scoping, CSRF tests, embed billing bypass

## Proposed Solutions

### Option 1: Trim Plan to ~250 Lines (Recommended)
- Move all "deferred work discussed inline" items to the Deferred table
- Collapse Research Insights to only actionable items
- Phase 5 becomes 3 lines
- **Effort:** Small
- **Risk:** None

## Acceptance Criteria

- [ ] All items discussed in Research Insights are either in Acceptance Criteria OR Deferred table
- [ ] No "limbo" items that are neither accepted nor deferred
- [ ] Plan is under 300 lines

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-05 | Created from simplicity review of deepened plan | Deepening added value but also noise |
