---
status: pending
priority: p1
issue_id: "011"
tags: [code-review, typescript]
dependencies: ["004"]
---

# `toAISDKTools` Adapter Won't Compile: `AnyTool` Has No `execute` Method

## Problem Statement

The plan's `toAISDKTools` adapter accepts `AnyTool[]` and calls `t.execute()`. But `AnyTool` (defined in `packages/tools/src/types.ts:48-60`) is a metadata-only interface with `id`, `description`, `inputSchema`, `outputSchema` — it intentionally has NO `execute` method. Only `Tool<TInput, TOutput>` has `execute`.

## Findings

- `AnyTool` at `packages/tools/src/types.ts:48-60`: no `execute` property
- `Tool<TInput, TOutput>` at lines 84-93: has `execute`
- The plan's adapter at line 373 will fail with TypeScript error: Property 'execute' does not exist on type 'AnyTool'
- Additionally, plan drops `ToolContext` generic `<TEnv>` and changes `userId` from `string | null | undefined` to required `string` — both breaking changes

## Proposed Solutions

### Option 1: Accept `Tool<any, any>[]` (Recommended)

**Approach:** Change the adapter parameter type to `Tool<any, any>[]` matching the existing `InternalTool` pattern used by `ToolRegistry`.

```ts
export function toAISDKTools(hareTools: Tool<any, any>[], context: ToolContext) {
  return Object.fromEntries(
    hareTools.map(t => [
      t.id,
      aiTool({
        description: t.description,
        inputSchema: t.inputSchema,
        execute: async (params) => t.execute(params, context),
      }),
    ])
  )
}
```

**Effort:** Small (10 min)
**Risk:** Low

## Acceptance Criteria

- [ ] Adapter compiles with actual `AnyTool`/`Tool` types from codebase
- [ ] `ToolContext` generic `<TEnv>` preserved when adding `agentId`
- [ ] `userId` remains `string | null | undefined` (not required string)
