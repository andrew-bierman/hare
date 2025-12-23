# Cloudflare Agents SDK Migration Guide

This guide provides step-by-step instructions for migrating Hare to use the official Cloudflare Agents SDK.

## Overview

See [CLOUDFLARE_AGENTS_ALIGNMENT.md](../CLOUDFLARE_AGENTS_ALIGNMENT.md) in the root directory for a detailed analysis of the current architecture vs. Cloudflare Agents SDK requirements.

## Quick Start

### 1. Install Cloudflare Agents SDK

```bash
cd apps/web
bun add agents
```

### 2. Configure Durable Objects

Update `apps/web/wrangler.jsonc` to include Durable Objects bindings:

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "HARE_AGENT",
        "class_name": "HareAgent"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["HareAgent"]
    }
  ]
}
```

### 3. Create Agent Class

Create `apps/web/src/lib/agents/durable/base.ts` extending the CF Agents SDK Agent class. See the alignment document for full implementation examples.

## Key Changes Required

1. **Architecture**: Shift from stateless agents to Durable Object-based instances
2. **Communication**: Add WebSocket support alongside existing SSE
3. **State Management**: Use DO state instead of manual D1 queries
4. **Deployment**: Provision DO instances when deploying agents
5. **Client**: Add React hooks and client SDK for seamless integration

## Migration Strategy

### Recommended: Hybrid Approach

- **Phase 1**: Add CF Agents SDK, keep existing implementation
- **Phase 2**: New agents use Durable Objects
- **Phase 3**: Gradually migrate existing agents
- **Phase 4**: Deprecate old implementation

**Timeline**: 3-6 months

## Benefits

✅ True stateful agents
✅ Real-time WebSocket communication  
✅ Better performance (warm instances)
✅ Simplified state management
✅ Scalability to millions of agents

## Resources

- [Detailed Alignment Analysis](../CLOUDFLARE_AGENTS_ALIGNMENT.md)
- [Cloudflare Agents Docs](https://developers.cloudflare.com/agents/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
