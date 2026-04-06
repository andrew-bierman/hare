---
status: pending
priority: p2
issue_id: "014"
tags: [code-review, architecture]
dependencies: []
---

# Move Dynamic System Prompt Injection from Phase 4 to Phase 0

## Problem Statement

The `buildSystemPrompt()` enhancement (injecting capability awareness) is placed in Phase 4. But tools that need it ship in Phases 0-3. Without the prompt enhancement, agents in Phases 0-3 will have tools available but won't know about them — context starvation.

## Findings

- Phase 0: Tool calling enabled — agent needs to know what tools are available
- Phase 2: Document + browser tools added — agent unaware
- Phase 3: Workflow tools added — agent unaware
- Phase 4: System prompt injection added — too late
- A simpler v1: just list loaded tool names in the prompt (no capability flags needed)
- Source: Agent-native reviewer + Simplicity reviewer verification agents

## Proposed Solutions

### Option 1: Move Simplified Version to Phase 0

**Approach:** In Phase 0, after capability-gated tool loading, inject loaded tool names into system prompt. Keep the rich capability metadata injection as a Phase 4 enhancement.

```ts
// Simple v1 for Phase 0
const toolNames = loadedTools.map(t => t.id).join(', ')
parts.push(`\nAvailable tools: ${toolNames}`)
```

**Effort:** Small (30 min)
**Risk:** None

## Acceptance Criteria

- [ ] System prompt includes list of available tool names starting from Phase 0
- [ ] Agent knows about browser/document/workflow tools as they're added in each phase
