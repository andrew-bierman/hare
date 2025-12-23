# Side-by-Side: Current Hare vs. Cloudflare Agents SDK

This document provides a visual comparison between Hare's current architecture and what it would look like with the official Cloudflare Agents SDK.

## Architecture Comparison

### Current Hare Architecture

```
┌─────────────────────────────────────────────────────┐
│            Hare (Current Implementation)             │
├─────────────────────────────────────────────────────┤
│                                                      │
│  User Request                                        │
│      │                                               │
│      ▼                                               │
│  ┌─────────────────┐                                │
│  │  Next.js Pages  │  (React Server Components)     │
│  └────────┬────────┘                                │
│           │                                          │
│           ▼                                          │
│  ┌─────────────────┐                                │
│  │  Hono API       │  (REST + SSE streaming)        │
│  └────────┬────────┘                                │
│           │                                          │
│           ├──► Load agent config from D1            │
│           │                                          │
│           ▼                                          │
│  ┌──────────────────┐                               │
│  │  EdgeAgent       │  (Ephemeral, created per      │
│  │  (Custom class)  │   request, destroyed after)   │
│  └────────┬─────────┘                               │
│           │                                          │
│           ├──► Query D1 for conversation history    │
│           ├──► Call Workers AI                       │
│           ├──► Save messages to D1                   │
│           │                                          │
│           ▼                                          │
│  ┌──────────────────┐                               │
│  │  SSE Response    │  (One-way server→client)      │
│  └──────────────────┘                               │
│                                                      │
│  State: Stored in shared D1 database                │
│  Communication: Server-Sent Events only              │
│  Agent Lifetime: Per-request (stateless)             │
└─────────────────────────────────────────────────────┘
```

### With Cloudflare Agents SDK

```
┌─────────────────────────────────────────────────────┐
│         Hare with Cloudflare Agents SDK              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  User Request                                        │
│      │                                               │
│      ▼                                               │
│  ┌─────────────────┐                                │
│  │  Next.js Pages  │  (React Server Components)     │
│  └────────┬────────┘                                │
│           │                                          │
│           ▼                                          │
│  ┌─────────────────┐                                │
│  │  Hono API       │  (REST + WebSocket routing)    │
│  └────────┬────────┘                                │
│           │                                          │
│           ▼                                          │
│  ┌──────────────────────────────────────────────┐   │
│  │         Durable Object Namespace             │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │  HareAgent DO Instance (user-123)      │  │   │
│  │  │  extends Agent from 'agents' SDK       │  │   │
│  │  │                                        │  │   │
│  │  │  • Persistent state (conversation)    │  │   │
│  │  │  • SQLite database per agent          │  │   │
│  │  │  • WebSocket connections              │  │   │
│  │  │  • Event handlers (onMessage, etc.)   │  │   │
│  │  │                                        │  │   │
│  │  │  ┌──────────────────────────────────┐ │  │   │
│  │  │  │  Agent State (in-memory)        │ │  │   │
│  │  │  │  • conversation history         │ │  │   │
│  │  │  │  • user context                 │ │  │   │
│  │  │  │  • tool configurations          │ │  │   │
│  │  │  └──────────────────────────────────┘ │  │   │
│  │  │                                        │  │   │
│  │  │  ┌──────────────────────────────────┐ │  │   │
│  │  │  │  SQLite (per DO)                │ │  │   │
│  │  │  │  • long-term memory             │ │  │   │
│  │  │  │  • analytics                    │ │  │   │
│  │  │  │  • preferences                  │ │  │   │
│  │  │  └──────────────────────────────────┘ │  │   │
│  │  │                                        │  │   │
│  │  │  Calls Workers AI ──────────────────► │  │   │
│  │  └────────────────────────────────────────┘  │   │
│  │                                               │   │
│  │  Other agent instances...                    │   │
│  └──────────────────────────────────────────────┘   │
│           │                                          │
│           ▼                                          │
│  ┌──────────────────┐                               │
│  │  WebSocket       │  (Bi-directional streaming)   │
│  │  or HTTP         │                               │
│  └──────────────────┘                               │
│                                                      │
│  State: Per-DO instance (isolated, persistent)      │
│  Communication: WebSocket (real-time) + HTTP         │
│  Agent Lifetime: Long-lived (stateful)              │
└─────────────────────────────────────────────────────┘
```

## Code Comparison

### Creating an Agent

**Current Hare:**
```typescript
// Load agent configuration from database
const [agentConfig] = await db
  .select()
  .from(agents)
  .where(eq(agents.id, agentId));

// Create ephemeral agent instance
const agent = await createAgentFromConfig(
  agentConfig,
  db,
  env,
  { userId, includeSystemTools: true }
);

// Use for this request only
const response = await agent.stream(messages);
// Agent is destroyed after request
```

**With CF Agents SDK:**
```typescript
// Get persistent Durable Object instance by ID
const durableObjectId = env.HARE_AGENT.idFromName(agentId);
const agent = env.HARE_AGENT.get(durableObjectId);

// Agent is already initialized and maintaining state
// Just send the request to it
const response = await agent.fetch(request);
// Agent continues running after request
```

### State Management

**Current Hare:**
```typescript
// Manual database queries for every interaction
const messages = await db
  .select()
  .from(messages)
  .where(eq(messages.conversationId, conversationId));

// Save new message
await db.insert(messages).values({
  conversationId,
  role: 'user',
  content: message,
});

// Load again for next request
const updatedMessages = await db.select()...
```

**With CF Agents SDK:**
```typescript
// Automatic state management in Durable Object
class HareAgent extends Agent {
  async onMessage(client, message) {
    // State is automatically available
    const history = await this.getState('history') ?? [];
    
    // Update state
    history.push({ role: 'user', content: message });
    await this.setState('history', history);
    
    // State persists automatically
  }
}
```

### Real-Time Communication

**Current Hare (SSE):**
```typescript
// One-way streaming only (server → client)
return streamSSE(c, async (stream) => {
  for await (const chunk of response.textStream) {
    await stream.writeSSE({
      event: 'message',
      data: JSON.stringify({ type: 'text', content: chunk }),
    });
  }
});

// Client can't send messages back during streaming
// Must wait for stream to complete
```

**With CF Agents SDK (WebSocket):**
```typescript
// Bi-directional streaming (client ↔ server)
class HareAgent extends Agent {
  async onConnect(client) {
    // Client connected
    client.send('Welcome!');
  }

  async onMessage(client, message) {
    // Client sent message during streaming
    // Handle immediately
    const response = await this.processMessage(message);
    
    // Stream back
    for await (const chunk of response) {
      client.send(chunk);
    }
  }
}

// Client can interrupt, ask questions, provide feedback
// True real-time interaction
```

### Frontend Integration

**Current Hare:**
```typescript
// Custom React hooks with React Query
function useAgentChat(agentId) {
  const [messages, setMessages] = useState([]);
  
  const sendMessage = async (message) => {
    // Manual fetch call
    const response = await fetch(`/api/agents/${agentId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    
    // Manual SSE parsing
    const reader = response.body.getReader();
    // ... complex streaming logic ...
  };
  
  return { messages, sendMessage };
}
```

**With CF Agents SDK:**
```typescript
// Built-in React hooks
import { useAgentChat } from '@/lib/agents/client/hooks';

function ChatComponent({ agentId }) {
  // Everything handled automatically
  const {
    messages,
    sendMessage,
    isConnected,
    isLoading,
    currentResponse
  } = useAgentChat(agentId);
  
  // WebSocket connection managed automatically
  // State synchronized automatically
  // Reconnection handled automatically
  
  return <ChatUI messages={messages} onSend={sendMessage} />;
}
```

## Feature Comparison Table

| Feature | Current Hare | With CF Agents SDK |
|---------|--------------|-------------------|
| **Agent Instances** | Ephemeral (per-request) | Persistent (long-lived) |
| **State Storage** | D1 (shared database) | DO state + SQLite (per agent) |
| **State Queries** | Manual DB queries | Automatic (in-memory + persistent) |
| **Communication** | SSE (one-way) | WebSocket (bi-directional) |
| **Real-Time** | ❌ No | ✅ Yes |
| **Collaborative** | ❌ No | ✅ Yes |
| **Agent Warm Time** | Cold start every time | Stays warm |
| **Latency** | Good (~100-200ms) | Better (~50-100ms) |
| **State Consistency** | Eventual (DB) | Strong (single-threaded) |
| **Scalability** | Good | Excellent (millions of DOs) |
| **Code Complexity** | Medium | Low (less boilerplate) |
| **React Hooks** | Custom | Built-in |
| **Scheduling** | ❌ Not implemented | ✅ Built-in |
| **Workflows** | ❌ Not implemented | ✅ Built-in |
| **Human-in-Loop** | ⚠️ Manual | ✅ Built-in |

## User Experience Comparison

### Conversation Flow

**Current Hare:**
```
User: "Hello"
  └─► Server: Creates agent
       └─► Queries DB for history
            └─► Calls Workers AI
                 └─► Saves to DB
                      └─► Returns SSE stream ────► User sees response

User: "How are you?"
  └─► Server: Creates NEW agent instance
       └─► Queries DB for history (including "Hello")
            └─► Calls Workers AI
                 └─► Saves to DB
                      └─► Returns SSE stream ────► User sees response

(Agent recreated every time)
```

**With CF Agents SDK:**
```
User: "Hello"
  └─► Server: Routes to existing agent DO
       └─► Agent has context in memory
            └─► Calls Workers AI
                 └─► Updates state
                      └─► WebSocket stream ────► User sees response

User: "How are you?"
  └─► Server: Same agent DO (still alive)
       └─► Agent already has context
            └─► Calls Workers AI (with full context)
                 └─► Updates state
                      └─► WebSocket stream ────► User sees response

(Same agent throughout conversation)
```

### Multi-User Collaboration

**Current Hare:**
```
User A sends message
  └─► Server processes ────────────────────────┐
                                                 │
User B sends message (while A is processing)   │
  └─► Server processes ──────────────┐         │
                                      │         │
Both responses returned independently │         │
No coordination between requests      │         │
                                      ▼         ▼
                            User B sees    User A sees
                            response       response

(No real-time sync between users)
```

**With CF Agents SDK:**
```
User A connects via WebSocket
  └─► Agent DO receives connection ──────────┐
                                              │
User B connects via WebSocket                │
  └─► Agent DO receives connection ──────────┤
                                              │
                       Single Agent Instance  │
                       Coordinates all users  │
                                              │
User A sends message                          │
  └─► All connected users see                │
       message in real-time ◄─────────────────┤
                                              │
User B sends message                          │
  └─► All connected users see                │
       message in real-time ◄─────────────────┘

(Real-time coordination and sync)
```

## Performance Comparison

### Request Latency

**Current Hare:**
```
User Request
  │
  ├─ Load agent config from D1 .......... ~10-20ms
  ├─ Create agent instance .............. ~5-10ms
  ├─ Load conversation history from D1 .. ~20-30ms
  ├─ Call Workers AI .................... ~200-500ms
  ├─ Save response to D1 ................ ~10-20ms
  │
Total: ~245-580ms per request
```

**With CF Agents SDK:**
```
User Request
  │
  ├─ Route to Durable Object ............ ~5-10ms
  │  (agent already initialized)
  ├─ Load state from DO memory .......... ~1-2ms
  │  (no DB query)
  ├─ Call Workers AI .................... ~200-500ms
  ├─ Update DO state .................... ~1-2ms
  │
Total: ~207-514ms per request

Improvement: ~15-25% faster
(More improvement for state-heavy operations)
```

### Cold Start Comparison

**Current Hare:**
- Every request is a "cold start" for agent logic
- Must query DB, recreate context, initialize tools
- ~30-50ms overhead per request

**With CF Agents SDK:**
- Agent stays warm after first use
- Context already in memory
- Tools already initialized
- ~5-10ms overhead for warm requests

## When to Use Each Approach

### Stay with Current (No Migration)

**Good for:**
- ✅ Simple request/response agents
- ✅ No need for real-time features
- ✅ Limited engineering resources
- ✅ Current implementation meets needs

**Not good for:**
- ❌ Collaborative experiences
- ❌ Interactive agents
- ❌ High-frequency conversations
- ❌ Complex state management

### Migrate to CF Agents SDK

**Good for:**
- ✅ Real-time chat experiences
- ✅ Collaborative agents (multiple users)
- ✅ Interactive workflows
- ✅ Stateful conversations
- ✅ High-frequency interactions
- ✅ Complex agent behaviors
- ✅ Human-in-the-loop scenarios

**Required:**
- ⚠️ Team familiar with Durable Objects
- ⚠️ 3-6 months development time
- ⚠️ Budget for DO costs
- ⚠️ Testing infrastructure

## Conclusion

The main differences are:

1. **Stateful vs. Stateless**: CF Agents SDK provides persistent agent instances
2. **WebSocket vs. SSE**: CF Agents SDK enables bi-directional communication
3. **Automatic vs. Manual**: CF Agents SDK handles state management automatically
4. **Warm vs. Cold**: CF Agents SDK keeps agents alive between requests
5. **Real-time vs. Request/Response**: CF Agents SDK enables collaborative experiences

Choose migration if you need advanced features and can invest the development time. Stay current if your use case is simple and the current implementation works well.

---

See [ACTION_PLAN.md](./ACTION_PLAN.md) for decision framework and next steps.
