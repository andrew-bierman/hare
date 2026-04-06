---
status: pending
priority: p2
issue_id: "024"
tags: [code-review, architecture, agent-native]
dependencies: ["017"]
---

# Tool Execution Paths Conflated with AI Inference Usage Tracking

## Problem Statement

The plan's Phase 1d adds usage tracking to tool execution paths (`hare-agent.ts:640-706`, `mcp-agent.ts:103-127`). However, these paths execute tools -- they do NOT call `streamText()` and produce no AI token usage. Recording token-based "usage" for tool execution is semantically wrong. Tool execution should track execution count and duration, not inputTokens/outputTokens.

## Findings

- **Source:** Architecture strategist review
- Tool execution handlers call individual tools (HTTP requests, SQL queries, KV operations, etc.)
- No LLM inference happens during tool execution -- there is no `result.usage` to capture
- The `recordUsage()` helper is designed for AI inference (inputTokens, outputTokens, totalTokens)
- Using it for tool execution would produce records with all-zero token counts, confusing analytics

## Proposed Solutions

### Option 1: Defer Tool Execution Tracking (Recommended)
Remove Phase 1d's tool execution paths from scope. Focus on the 4 chat paths only.
- **Pros:** Simpler, avoids semantic confusion, aligned with simplicity review
- **Cons:** Tool execution remains untracked
- **Effort:** None (remove from plan)
- **Risk:** Low

### Option 2: Add a Separate Tool Execution Tracking Function
Create `recordToolExecution()` with different fields (executionCount, durationMs, toolId, no token fields).
- **Pros:** Accurate tracking per tool type
- **Cons:** More code, new schema consideration
- **Effort:** Medium
- **Risk:** Low

## Acceptance Criteria

- [ ] Decision made: track tool execution separately or defer
- [ ] If tracking, use fields appropriate for tool execution (not tokens)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-05 | Created from architecture review | Tool execution has no streamText/usage -- conflating with AI inference is a category error |
