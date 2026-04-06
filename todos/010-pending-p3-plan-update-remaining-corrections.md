---
status: pending
priority: p3
issue_id: "010"
tags: [code-review, quality]
dependencies: ["001", "004"]
---

# Update Plan with Remaining Corrections from Review

## Problem Statement

Several corrections from the AI SDK research and reviews need to be applied to the plan document itself before implementation begins.

## Findings

- `maxSteps: 5` should be `stopWhen: stepCountIs(5)` throughout plan
- `rerank()` from AI SDK should be `env.AI.run('@cf/baai/bge-reranker-base')` directly
- `transcribe()`/`generateSpeech()` should be `env.AI.run()` directly
- Plan mentions `parameters` in some tool examples — should be `inputSchema` for AI SDK v6
- `lora.ts` router filename should be `lora-adapters.ts` per naming convention
- Vision tool `imageUrl` parameter should use R2 keys only (not URLs) to avoid SSRF
- Missing `oauth_clients` table full schema (OAuth research provides complete definition with 4 tables)

## Acceptance Criteria

- [ ] All AI SDK v6 syntax corrected in plan
- [ ] Router filenames follow kebab-case convention
- [ ] Vision tool restricted to R2 keys (no URL SSRF vector)
- [ ] OAuth schema fully specified per MCP OAuth research
