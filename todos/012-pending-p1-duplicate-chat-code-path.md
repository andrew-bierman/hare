---
status: pending
priority: p1
issue_id: "012"
tags: [code-review, architecture]
dependencies: ["004"]
---

# `handleChatHTTP` Is a Duplicate Code Path — Plan Only Patches `handleChat`

## Problem Statement

`packages/agent/src/hare-agent.ts` has TWO near-identical `streamText` call sites: `handleChat` (WebSocket, line ~410) and `handleChatHTTP` (SSE, line ~490). The plan's Phase 0.1 only fixes the WebSocket path. Every change (tool wiring, message history cap, gateway config, capability-gated tools, `onStepFinish` logging) must apply to BOTH paths.

## Findings

- `handleChat` at line ~410: WebSocket-based chat, called for WS connections
- `handleChatHTTP` at line ~490: SSE-based chat, called for HTTP requests
- Both call `streamText` independently with duplicate logic
- Plan Phase 0.1 only shows fix for one path
- Source: Architecture strategist verification agent

## Proposed Solutions

### Option 1: Extract Shared `runInference` Method (Recommended)

**Approach:** Extract the shared inference logic into a private method. Both `handleChat` and `handleChatHTTP` call it.

```ts
private async runInference(options: {
  messages: Message[]
  tools: Tool<any, any>[]
  capabilities: AgentCapabilities
  gatewayConfig?: GatewayConfig
}) {
  const aiTools = toAISDKTools(options.tools, this.toolContext)
  return streamText({
    model: createWorkersAIModel({ ... }),
    messages: options.messages.slice(-50),
    tools: aiTools,
    stopWhen: stepCountIs(5),
  })
}
```

**Effort:** Medium (1-2 hours)
**Risk:** Low

## Acceptance Criteria

- [ ] Single `runInference` method used by both WebSocket and HTTP chat paths
- [ ] All Phase 0-1 changes (tools, gateway, history cap) apply to both paths
- [ ] Tests verify tool calling works via both WebSocket and HTTP
