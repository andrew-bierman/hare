---
status: pending
priority: p1
issue_id: "004"
tags: [code-review, architecture, typescript]
dependencies: ["001"]
---

# Hare Tool to AI SDK Tool Format Adapter Required

## Problem Statement

Hare's `Tool<TInput, TOutput>` (from `createTool`) uses a different interface than Vercel AI SDK's tool format expected by `streamText`. Passing Hare tools directly to `streamText({ tools })` will not compile. A conversion layer is needed.

## Findings

- **Hare tool format** (`packages/tools/src/types.ts`): `{ id, description, inputSchema, outputSchema, execute: (params, context) => ... }`
- **AI SDK v6 tool format** (`ai@6.0.14`): `{ description, inputSchema (Zod), execute: (params, options) => ... }` — no `id` (key is the tool name), no `outputSchema`, different `execute` signature
- **AI SDK tools are a Record** (`Record<string, Tool>`), not an array
- **AI SDK v6 uses `inputSchema`** property (v4 used `parameters`) — plan must use correct property name
- **Source:** TypeScript reviewer + Vercel AI SDK framework-docs-researcher

## Proposed Solutions

### Option 1: Create `toAISDKTools` Adapter Function (Recommended)

**Approach:** Build a thin adapter that converts Hare tools to AI SDK format.

```ts
// packages/agent/src/tool-adapter.ts
import { tool as aiTool } from 'ai'

export function toAISDKTools(hareTools: AnyTool[], context: ToolContext) {
  return Object.fromEntries(
    hareTools.map(t => [
      t.id,
      aiTool({
        description: t.description,
        inputSchema: t.inputSchema, // v6 uses inputSchema not parameters
        execute: async (params) => t.execute(params, context),
      }),
    ])
  )
}
```

**Pros:** Clean separation, existing tools unchanged, adapter is testable
**Cons:** One more file to maintain
**Effort:** Small (1-2 hours)
**Risk:** Low

## Recommended Action

Option 1. The adapter is ~15 lines of code and cleanly bridges the two tool systems.

## Technical Details

**New file:** `packages/agent/src/tool-adapter.ts`
**Modified file:** `packages/agent/src/hare-agent.ts` — import and use adapter in `handleChat`

## Acceptance Criteria

- [ ] `toAISDKTools` correctly converts all Hare tools to AI SDK format
- [ ] Converted tools work with `streamText({ tools: aiTools })`
- [ ] Tool IDs become Record keys (not array)
- [ ] `execute` correctly passes `ToolContext` from closure
- [ ] Unit test: convert a sample tool + verify it executes correctly

## Work Log

### 2026-04-04 - Discovery

**By:** Claude Code (TypeScript reviewer + AI SDK researcher)

**Actions:**
- Compared Hare tool interface with AI SDK v6 tool interface
- Confirmed format mismatch (array vs Record, different execute signatures)
- Verified `inputSchema` property name in v6 (not `parameters`)
