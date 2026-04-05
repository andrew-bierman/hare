---
status: done
priority: p1
issue_id: "001"
tags: [code-review, architecture, typescript]
dependencies: []
---

# AI SDK v6 API Breaking Changes in Plan Code Examples

## Problem Statement

The plan's code examples use AI SDK v4 syntax that will not compile with the installed `ai@6.0.14` and `workers-ai-provider@3.0.2`. Three breaking changes must be corrected before implementation.

## Findings

- **`maxSteps` removed in v5/v6**: Plan uses `maxSteps: 5` in `streamText()`. In AI SDK v6, this was replaced with `stopWhen: stepCountIs(5)`. The old property does not exist on the type.
  - File: Plan section Phase 0.1, `packages/agent/src/hare-agent.ts`
  
- **`workers-ai-provider` does NOT implement `RerankingModel`**: Plan uses `workersai.reranking('@cf/baai/bge-reranker-base')` with AI SDK's `rerank()` function. The provider only exports `.chat()`, `.embedding()`, and `.image()` methods. No `.reranking()` method exists.
  - File: Plan section Phase 2.1, `packages/api/src/services/vector-memory.ts`
  
- **`workers-ai-provider` does NOT implement `TranscriptionModel` or `SpeechModel`**: Plan uses AI SDK's `transcribe()` and `generateSpeech()` functions. The provider has no `.transcription()` or `.speech()` methods. Must use `env.AI.run()` directly for Whisper and TTS models.
  - File: Plan sections Phase 4.3-4.4, `packages/tools/src/speech.ts`

- **Verification source**: Direct inspection of installed packages at `node_modules/.bun/workers-ai-provider@3.0.2` and `node_modules/.bun/ai@6.0.14`

## Proposed Solutions

### Option 1: Update Plan Code to AI SDK v6 Syntax (Recommended)

**Approach:** Fix all three issues in the plan before implementation.

```ts
// Fix 1: Replace maxSteps with stopWhen
import { streamText, stepCountIs } from 'ai'
const result = await streamText({
  model,
  messages,
  tools: aiTools,
  stopWhen: stepCountIs(5), // NOT maxSteps: 5
})

// Fix 2: Call reranker via env.AI.run() directly instead of AI SDK rerank()
const reranked = await env.AI.run('@cf/baai/bge-reranker-base', {
  query,
  documents: candidates.map(c => c.metadata.content),
})

// Fix 3: Call Whisper/TTS via env.AI.run() directly
const sttResult = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
  audio: [...new Uint8Array(audioData)],
})
const ttsResult = await env.AI.run('@cf/myshell-ai/melotts', {
  text: 'Hello world',
})
```

**Pros:** Matches installed SDK versions, no custom adapters needed
**Cons:** Loses AI SDK abstraction for reranking/speech (minor)
**Effort:** Small (update plan, ~30 min)
**Risk:** Low

### Option 2: Implement Custom Provider Adapters

**Approach:** Create custom `RerankingModel`, `TranscriptionModel`, and `SpeechModel` implementations wrapping `env.AI.run()`.

**Pros:** Uses AI SDK abstractions consistently
**Cons:** Significant effort for marginal benefit, custom code to maintain
**Effort:** Large (4-6 hours per adapter)
**Risk:** Medium

## Recommended Action

Option 1. Update plan code examples before implementation begins.

## Technical Details

**Affected files in plan:**
- Phase 0.1: `streamText` call in `packages/agent/src/hare-agent.ts`
- Phase 2.1: `rerank()` call in `packages/api/src/services/vector-memory.ts`
- Phase 4.3: `transcribe_audio` tool in `packages/tools/src/speech.ts`
- Phase 4.4: `generate_speech` tool in `packages/tools/src/speech.ts`

**Installed versions:**
- `ai@6.0.14`
- `workers-ai-provider@3.0.2`
- `@ai-sdk/provider-utils@4.0.4`

## Acceptance Criteria

- [ ] Plan code uses `stopWhen: stepCountIs(N)` not `maxSteps`
- [ ] Reranking uses `env.AI.run()` directly, not AI SDK `rerank()`
- [ ] STT/TTS use `env.AI.run()` directly, not AI SDK `transcribe()`/`generateSpeech()`
- [ ] All code examples compile with installed SDK versions

## Work Log

### 2026-04-04 - Discovery

**By:** Claude Code (Vercel AI SDK framework-docs-researcher agent)

**Actions:**
- Inspected installed `workers-ai-provider@3.0.2` source at `node_modules/.bun/workers-ai-provider@3.0.2`
- Inspected AI SDK v6 types at `node_modules/.bun/ai@6.0.14`
- Confirmed `maxSteps` removal, missing provider methods
- Verified `gateway` option IS supported (positive finding)

**Learnings:**
- AI SDK v4→v6 had breaking changes in tool calling API (`parameters` → `inputSchema`, `maxSteps` → `stopWhen`)
- `workers-ai-provider` only implements chat, embedding, and image models
- For reranking, STT, TTS — must use Workers AI binding directly
