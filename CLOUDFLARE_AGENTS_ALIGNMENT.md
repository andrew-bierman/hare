# Cloudflare Agents SDK Alignment Analysis

## Executive Summary

After reviewing the Hare codebase and Cloudflare Agents SDK documentation, **Hare is NOT currently aligned with the official Cloudflare Agents SDK**. While Hare uses Cloudflare infrastructure (Workers AI, D1, KV, R2, Vectorize), it has built a custom agent implementation rather than using the official `@cloudflare/agents` (now `agents`) SDK.

## Current Architecture vs. Cloudflare Agents SDK

### What Hare Currently Has ✅

| Component | Current Implementation | Status |
|-----------|----------------------|--------|
| **Runtime** | Cloudflare Workers (via Next.js + @opennextjs/cloudflare) | ✅ Correct platform |
| **AI Models** | Workers AI (via custom provider) | ✅ Correct integration |
| **Database** | D1 with Drizzle ORM | ✅ Using CF D1 |
| **Cache** | KV bindings configured | ✅ Available |
| **Storage** | R2 bindings configured | ✅ Available |
| **Vectors** | Vectorize (configured but not in wrangler.jsonc) | ⚠️ Needs binding |
| **API Framework** | Hono with OpenAPI | ✅ Good choice |
| **AI SDK** | Vercel AI SDK | ✅ Compatible |

### What's Missing for Full CF Agents Alignment ❌

| Component | CF Agents SDK Provides | Hare's Status |
|-----------|----------------------|---------------|
| **Durable Objects** | Core architecture - each agent is a DO instance | ❌ Not using DOs |
| **Agent Class** | `extends Agent` from `agents` package | ❌ Custom `EdgeAgent` class |
| **State Management** | Automatic state sync + persistence per agent | ❌ Manual D1 queries |
| **WebSocket Support** | Built-in real-time bi-directional streaming | ❌ Using SSE only |
| **Client SDK** | `AgentClient` class for connecting to agents | ❌ No client SDK |
| **React Hooks** | `useAgent`, `useAgentChat` hooks | ❌ Manual React Query |
| **Per-Agent Storage** | SQLite + KV per Durable Object instance | ❌ Shared D1 database |
| **Scheduling** | Built-in cron/delayed task support | ❌ Not implemented |
| **Event-Driven** | Event handlers (onRequest, onMessage, etc.) | ❌ Standard HTTP handlers |

## Key Architectural Differences

### 1. Agent Instance Model

**Cloudflare Agents SDK:**
```typescript
// Each agent is a Durable Object instance
export class MyAgent extends Agent {
  async onRequest(request: Request) {
    // Agent logic with automatic state
    const count = await this.getState<number>("count") ?? 0;
    await this.setState("count", count + 1);
    return new Response(`Count: ${count + 1}`);
  }
}

// Agents are globally addressable by ID
const agent = env.MyAgent.getByName("user-123");
const response = await agent.fetch(request);
```

**Hare's Current Implementation:**
```typescript
// Agents are configurations in D1 database
const agentConfig = await db.select()
  .from(agents)
  .where(eq(agents.id, agentId));

// Create ephemeral agent instance per request
const agent = await createAgentFromConfig(agentConfig, db, env, options);
const response = await agent.stream(messages);
```

**Impact:** 
- ❌ Hare agents are stateless between requests
- ❌ No persistent agent instances
- ❌ Can't leverage Durable Objects' single-threaded consistency
- ❌ Every request recreates the agent

### 2. State Management

**Cloudflare Agents SDK:**
```typescript
// Automatic state persistence per agent instance
class CustomerSupportAgent extends Agent {
  async handleQuery() {
    // State is automatically persisted
    const conversationHistory = await this.getState("history") ?? [];
    conversationHistory.push(newMessage);
    await this.setState("history", conversationHistory);
  }
}
```

**Hare's Current Implementation:**
```typescript
// Manual database queries for state
const messages = await db.select()
  .from(messages)
  .where(eq(messages.conversationId, conversationId));

// Manual inserts for state changes
await db.insert(messages).values({
  conversationId,
  role: 'user',
  content: message,
});
```

**Impact:**
- ❌ More boilerplate for state management
- ❌ No automatic state synchronization
- ❌ Potential race conditions without DO coordination

### 3. Real-Time Communication

**Cloudflare Agents SDK:**
```typescript
class ChatAgent extends Agent {
  async onConnect(client: Client) {
    // WebSocket opened
    client.send("Welcome!");
  }

  async onMessage(client: Client, message: string) {
    // Handle incoming WebSocket message
    const response = await this.processMessage(message);
    client.send(response); // Real-time streaming
  }
}
```

**Hare's Current Implementation:**
```typescript
// Server-Sent Events (one-way streaming)
return streamSSE(c, async (stream) => {
  for await (const chunk of response.textStream) {
    await stream.writeSSE({
      event: 'message',
      data: JSON.stringify({ type: 'text', content: chunk }),
    });
  }
});
```

**Impact:**
- ❌ SSE is one-way only (server → client)
- ❌ No true real-time bi-directional communication
- ❌ Can't build collaborative or interactive agent experiences
- ❌ Missing the client-side SDK for seamless integration

## Migration Path to Full Cloudflare Agents SDK

### Phase 1: Add Cloudflare Agents SDK (Low Risk)

**Install the SDK:**
```bash
npm install agents  # or bun add agents
```

**Update `wrangler.jsonc` with Durable Objects:**
```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "HARE_AGENT",
        "class_name": "HareAgent",
        "script_name": "hare"
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

### Phase 2: Create Durable Object Agent Class (Medium Risk)

**Create `src/lib/agents/durable-agent.ts`:**
```typescript
import { Agent } from 'agents';
import type { Ai } from '@cloudflare/workers-types';
import { streamText } from 'ai';
import { createWorkersAIModel } from './providers/workers-ai';

export interface HareAgentEnv {
  AI: Ai;
  DB: D1Database;
  KV: KVNamespace;
}

/**
 * Durable Object-based Hare Agent
 * Each agent instance is a persistent, stateful entity
 */
export class HareAgent extends Agent<HareAgentEnv> {
  private model: ReturnType<typeof createWorkersAIModel> | null = null;

  /**
   * Initialize agent on first access
   */
  async initialize() {
    // Load agent configuration from state
    const config = await this.getState<AgentConfig>('config');
    
    if (!config) {
      throw new Error('Agent not configured');
    }

    // Initialize AI model
    this.model = createWorkersAIModel(config.model, this.env.AI);
  }

  /**
   * Handle incoming chat messages via WebSocket
   */
  async onMessage(client: any, message: string) {
    if (!this.model) {
      await this.initialize();
    }

    // Get conversation history from agent's state
    const history = await this.getState<CoreMessage[]>('history') ?? [];
    
    // Add user message
    history.push({ role: 'user', content: message });

    // Stream response
    const result = streamText({
      model: this.model!,
      messages: history,
    });

    // Stream chunks to client
    for await (const chunk of (await result).textStream) {
      client.send(JSON.stringify({ type: 'text', content: chunk }));
    }

    // Save updated history
    const fullResponse = await (await result).text;
    history.push({ role: 'assistant', content: fullResponse });
    await this.setState('history', history);
  }

  /**
   * Handle HTTP requests (for REST API compatibility)
   */
  async onRequest(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === '/chat' && request.method === 'POST') {
      const { message } = await request.json();
      
      // Process message (similar to WebSocket handler)
      if (!this.model) {
        await this.initialize();
      }

      const history = await this.getState<CoreMessage[]>('history') ?? [];
      history.push({ role: 'user', content: message });

      const result = await streamText({
        model: this.model!,
        messages: history,
      });

      const fullResponse = await (await result).text;
      history.push({ role: 'assistant', content: fullResponse });
      await this.setState('history', history);

      return new Response(JSON.stringify({ response: fullResponse }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }
}

// Export for Cloudflare Workers
export default HareAgent;
```

### Phase 3: Update Deployment Logic (Medium Risk)

**Modify `src/lib/api/routes/agents.ts`:**
```typescript
app.openapi(deployAgentRoute, async (c) => {
  const { id } = c.req.valid('param');
  const db = await getDb(c);
  const env = await getCloudflareEnv(c);
  
  // Get agent configuration
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, id));

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  // Create/update Durable Object instance
  // Use agent.id as the Durable Object name for global addressability
  const durableObjectId = env.HARE_AGENT.idFromName(agent.id);
  const durableObjectStub = env.HARE_AGENT.get(durableObjectId);

  // Initialize the Durable Object with agent configuration
  await durableObjectStub.fetch('https://internal/initialize', {
    method: 'POST',
    body: JSON.stringify({
      id: agent.id,
      name: agent.name,
      model: agent.model,
      instructions: agent.instructions,
      config: agent.config,
    }),
  });

  // Update status in D1
  await db
    .update(agents)
    .set({ status: 'deployed', updatedAt: new Date() })
    .where(eq(agents.id, id));

  return c.json({
    id: agent.id,
    status: 'deployed',
    endpoint: `https://your-domain.workers.dev/agents/${agent.id}`,
  });
});
```

### Phase 4: Add WebSocket Chat Support (High Risk)

**Create WebSocket endpoint:**
```typescript
// In Durable Object
export class HareAgent extends Agent<HareAgentEnv> {
  async fetch(request: Request) {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Regular HTTP
    return this.onRequest(request);
  }

  private async handleWebSocket(request: Request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept WebSocket connection
    this.ctx.acceptWebSocket(server);

    // Set up message handler
    server.addEventListener('message', (event) => {
      this.onMessage(server, event.data);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}
```

### Phase 5: Add Client SDK (Low Risk)

**Create `src/lib/agents/client.ts`:**
```typescript
/**
 * Client SDK for interacting with Durable Object agents
 */
export class HareAgentClient {
  private ws: WebSocket | null = null;
  private agentId: string;
  private baseUrl: string;

  constructor(agentId: string, baseUrl: string) {
    this.agentId = agentId;
    this.baseUrl = baseUrl;
  }

  /**
   * Connect to agent via WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.baseUrl.replace('https://', 'wss://');
      this.ws = new WebSocket(`${wsUrl}/agents/${this.agentId}/ws`);

      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
    });
  }

  /**
   * Send message to agent
   */
  async sendMessage(message: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    this.ws.send(message);
  }

  /**
   * Listen for agent responses
   */
  onMessage(callback: (message: string) => void): void {
    if (!this.ws) {
      throw new Error('Not connected');
    }

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data.content);
    };
  }

  /**
   * Disconnect from agent
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

**Create React hooks:**
```typescript
// src/lib/agents/hooks.ts
import { useEffect, useState, useCallback } from 'react';
import { HareAgentClient } from './client';

export function useAgentChat(agentId: string) {
  const [client, setClient] = useState<HareAgentClient | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const agentClient = new HareAgentClient(
      agentId,
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    );

    agentClient.connect().then(() => {
      setIsConnected(true);
      setClient(agentClient);

      agentClient.onMessage((message) => {
        setMessages((prev) => [...prev, message]);
      });
    });

    return () => {
      agentClient.disconnect();
    };
  }, [agentId]);

  const sendMessage = useCallback((message: string) => {
    if (client) {
      client.sendMessage(message);
      setMessages((prev) => [...prev, message]);
    }
  }, [client]);

  return {
    messages,
    sendMessage,
    isConnected,
  };
}
```

## Benefits of Full CF Agents SDK Alignment

### 1. **True Stateful Agents** 🎯
- Each agent instance maintains state across requests
- No need for complex database queries to recreate context
- Single-threaded consistency per agent (no race conditions)

### 2. **Real-Time Interactions** ⚡
- WebSocket support for bi-directional streaming
- Build collaborative experiences (multiple users, one agent)
- Human-in-the-loop workflows with instant feedback

### 3. **Better Performance** 🚀
- Agents stay "warm" in Durable Objects (no cold starts)
- State is co-located with compute (no DB round trips)
- Automatic caching of agent context

### 4. **Scalability** 📈
- Millions of concurrent agent instances
- Each agent isolated in its own Durable Object
- Global distribution with automatic routing

### 5. **Simplified Code** 🧹
- Less boilerplate for state management
- Built-in primitives for common patterns
- React hooks for easy frontend integration

### 6. **Advanced Features** 🔮
- Scheduled tasks (cron) per agent
- Workflow orchestration
- Tool execution with human confirmation
- Event-driven architecture

## Risks & Considerations

### 1. **Breaking Changes** ⚠️
- Current API endpoints would need updates
- Database schema changes
- Frontend components need rewrites

**Mitigation:** Use feature flags and gradual migration

### 2. **Learning Curve** 📚
- Team needs to learn Durable Objects concepts
- New deployment patterns
- Different debugging approaches

**Mitigation:** Comprehensive documentation and examples

### 3. **Testing Complexity** 🧪
- Durable Objects require different testing strategies
- Need Miniflare for local development
- State management testing is more complex

**Mitigation:** Use Cloudflare's testing tools and best practices

### 4. **Cost Implications** 💰
- Durable Objects have different pricing than Workers
- Need to estimate DO instance counts
- Storage costs for per-agent SQLite

**Mitigation:** Monitor usage and implement hibernation strategies

## Recommendation

### Option 1: Full Migration to CF Agents SDK (Recommended for Long-Term) ✅

**Pros:**
- Future-proof architecture
- Access to all CF Agents features
- Better performance and scalability
- Aligned with CF roadmap

**Cons:**
- Significant refactoring required
- Higher short-term risk
- Team training needed

**Timeline:** 2-3 months

### Option 2: Hybrid Approach (Recommended for Short-Term) ⚡

**Phase 1 (Now):** Keep current implementation but add DO support
- Add CF Agents SDK alongside current code
- New agents use Durable Objects
- Old agents continue with current architecture
- Gradual migration path

**Phase 2 (3 months):** Migrate core features
- Move chat to WebSocket + DO
- Add real-time collaboration
- Implement per-agent state

**Phase 3 (6 months):** Full migration
- Deprecate old architecture
- All agents on Durable Objects
- Remove legacy code

**Pros:**
- Lower risk
- Incremental value delivery
- Time to learn and adapt

**Cons:**
- Maintaining two systems temporarily
- More complex codebase during transition

**Timeline:** 6 months

### Option 3: Stay with Current Implementation ⏸️

**When to choose:**
- If Durable Objects features aren't needed
- If current implementation meets all requirements
- If team doesn't have capacity for migration

**Cons:**
- Not aligned with "Cloudflare Agents" branding
- Missing out on advanced features
- Harder to market as "CF Agents platform"

## Next Steps

1. **Decision:** Choose migration approach (Option 1, 2, or 3)

2. **If migrating (Option 1 or 2):**
   - [ ] Install `agents` package
   - [ ] Set up Durable Objects bindings
   - [ ] Create proof-of-concept agent
   - [ ] Test performance and functionality
   - [ ] Plan phased rollout

3. **Documentation:**
   - [ ] Update README with accurate architecture
   - [ ] Clarify "CF Agents" means "CF infrastructure" not "CF Agents SDK"
   - [ ] Document migration path for users

4. **Communication:**
   - [ ] Inform stakeholders of current state
   - [ ] Share migration plan and timeline
   - [ ] Update marketing materials

## Conclusion

**Hare is currently a Cloudflare-native AI agent platform but NOT using the official Cloudflare Agents SDK.** While it leverages CF infrastructure (Workers, D1, KV, R2, Workers AI), it has built a custom agent implementation.

To achieve **full alignment with Cloudflare Agents**, migration to Durable Objects and the `agents` SDK is required. This would unlock real-time communication, true stateful agents, and advanced features like scheduling and workflows.

The recommended approach is a **hybrid migration** (Option 2) to balance risk and reward, allowing gradual adoption while maintaining current functionality.
