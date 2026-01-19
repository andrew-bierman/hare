# @hare/testing

Shared test utilities, factories, and mocks for the Hare platform.

## Installation

This package is part of the Hare monorepo. It's automatically available to other packages in the workspace.

```json
{
  "devDependencies": {
    "@hare/testing": "workspace:*"
  }
}
```

## Features

- **Factory Functions**: Create test data for all core entities
- **Database Seeding**: Set up complete test scenarios with related entities
- **Mock Builders**: Test doubles for Cloudflare bindings (D1, KV, R2, AI, Vectorize)

## Factory Functions

Factory functions create test data with sensible defaults. All fields can be overridden for specific test scenarios.

### User Factory

```ts
import { createTestUser, createTestUsers } from '@hare/testing'

// Create a user with defaults
const user = createTestUser()
// { id: 'uuid', name: 'Test User 1', email: 'testuser1@example.com', ... }

// Create with custom values
const adminUser = createTestUser({
  name: 'Admin User',
  email: 'admin@example.com',
  emailVerified: true
})

// Create multiple users
const users = createTestUsers(5)
```

### Workspace Factory

```ts
import { createTestWorkspace, createTestWorkspaceMember } from '@hare/testing'

// Create a workspace (requires ownerId)
const workspace = createTestWorkspace({ ownerId: user.id })

// Create with custom values
const proWorkspace = createTestWorkspace({
  ownerId: user.id,
  name: 'Pro Workspace',
  planId: 'pro'
})

// Create a workspace member
const member = createTestWorkspaceMember({
  workspaceId: workspace.id,
  userId: user.id,
  role: 'admin'
})
```

### Agent Factory

```ts
import { createTestAgent, createTestAgentVersion } from '@hare/testing'

// Create an agent
const agent = createTestAgent({
  workspaceId: workspace.id,
  createdBy: user.id
})

// Create a deployed agent with custom config
const deployedAgent = createTestAgent({
  workspaceId: workspace.id,
  createdBy: user.id,
  status: 'deployed',
  config: { temperature: 0.7, maxTokens: 1000 }
})

// Create an agent version
const version = createTestAgentVersion({
  agentId: agent.id,
  createdBy: user.id,
  version: 1
})
```

### Tool Factory

```ts
import { createTestTool, createTestHttpTool, createTestCustomTool } from '@hare/testing'

// Create a basic tool
const tool = createTestTool({
  workspaceId: workspace.id,
  createdBy: user.id,
  type: 'http'
})

// Create an HTTP tool with config
const httpTool = createTestHttpTool({
  workspaceId: workspace.id,
  createdBy: user.id,
  config: { url: 'https://api.example.com', method: 'POST' }
})

// Create a custom tool
const customTool = createTestCustomTool({
  workspaceId: workspace.id,
  createdBy: user.id
})
```

### Webhook Factory

```ts
import { createTestWebhook, createTestWebhookLog } from '@hare/testing'

// Create a webhook
const webhook = createTestWebhook({
  agentId: agent.id,
  events: ['message.received', 'error']
})

// Create a webhook log
const log = createTestWebhookLog({
  webhookId: webhook.id,
  event: 'message.received',
  status: 'success',
  responseStatus: 200
})
```

## Database Seeding

Seeding utilities create complete test scenarios with properly related entities.

```ts
import { seedWorkspace, seedAgent, seedAgentWithTools, seedAgentWithWebhooks } from '@hare/testing'

// Seed a workspace with owner
const { user, workspace, member } = await seedWorkspace(db)

// Seed an agent with its workspace
const { user, workspace, agent } = await seedAgent(db)

// Seed an agent with tools
const { agent, tools } = await seedAgentWithTools(db, { toolCount: 3 })

// Seed an agent with custom tools
const { agent, tools } = await seedAgentWithTools(db, {
  tools: [
    { name: 'Search API', type: 'http' },
    { name: 'Calculator', type: 'custom' }
  ]
})

// Seed an agent with webhooks
const { agent, webhooks } = await seedAgentWithWebhooks(db, { webhookCount: 2 })

// Seed a complete environment
const env = await seedCompleteEnvironment(db, {
  userCount: 2,
  workspacesPerUser: 2,
  agentsPerWorkspace: 3,
  toolsPerWorkspace: 5,
  webhooksPerAgent: 1
})

// Cleanup after tests
await cleanupSeededData(db)
```

## Mock Builders

### Cloudflare KV

```ts
import { createMockKV } from '@hare/testing'

const kv = createMockKV()

// Use like real KV
await kv.put('key', 'value')
const value = await kv.get('key')
const { keys } = await kv.list({ prefix: 'user:' })

// Access internal store for assertions
expect(kv._store.size).toBe(1)

// Clear for test isolation
kv._clear()
```

### Cloudflare R2

```ts
import { createMockR2 } from '@hare/testing'

const r2 = createMockR2()

// Use like real R2
await r2.put('file.txt', 'content')
const object = await r2.get('file.txt')
const text = await object?.text()

// Clear for test isolation
r2._clear()
```

### Cloudflare D1

```ts
import { createMockD1 } from '@hare/testing'

const db = createMockD1()

// Pre-configure mock results
db._setMockResult('SELECT * FROM users', [
  { id: '1', name: 'Test User' }
])

// Execute queries
const stmt = db.prepare('SELECT * FROM users')
const { results } = await stmt.all()

// Check query history
expect(db._queries).toHaveLength(1)
expect(db._queries[0].sql).toContain('SELECT')
```

### Cloudflare Workers AI

```ts
import { createMockAI } from '@hare/testing'

const ai = createMockAI()

// Pre-configure mock responses
ai._setMockResponse('@cf/meta/llama-3', { response: 'Hello!' })

// Run AI
const result = await ai.run('@cf/meta/llama-3', { prompt: 'Hi' })

// Check call history
expect(ai._calls).toHaveLength(1)
```

### Cloudflare Vectorize

```ts
import { createMockVectorize } from '@hare/testing'

const vectorize = createMockVectorize()

// Upsert vectors
await vectorize.upsert([
  { id: '1', values: [0.1, 0.2, 0.3], metadata: { text: 'hello' } }
])

// Query vectors
const results = await vectorize.query([0.1, 0.2, 0.3], { topK: 5 })
```

### Complete Mock Environment

```ts
import { createMockEnv } from '@hare/testing'

const env = createMockEnv({
  kvData: { 'user:1': JSON.stringify({ name: 'Test' }) },
  r2Data: { 'file.txt': 'content' },
  d1Results: { 'SELECT * FROM users': [{ id: '1' }] },
  aiResponses: { 'llama': { response: 'Hello' } },
  vectors: [{ id: '1', values: [0.1, 0.2, 0.3] }]
})

// Use in tests
const kv = await env.KV.get('user:1')
const r2 = await env.R2.get('file.txt')
```

## Test Isolation

For predictable tests, reset factory counters between tests:

```ts
import { resetAllFactoryCounters } from '@hare/testing'

beforeEach(() => {
  resetAllFactoryCounters()
})
```

Or reset individual counters:

```ts
import { __resetUserCounter, __resetAgentCounters } from '@hare/testing'

beforeEach(() => {
  __resetUserCounter()
  __resetAgentCounters()
})
```

## Sub-path Exports

Import from specific modules for smaller bundles:

```ts
// Just factories
import { createTestUser } from '@hare/testing/factories'

// Just mocks
import { createMockEnv } from '@hare/testing/mocks'

// Just seeds
import { seedAgent } from '@hare/testing/seeds'
```

## Type Exports

All entity types are exported for use in your tests:

```ts
import type {
  TestUser,
  TestWorkspace,
  TestAgent,
  TestTool,
  TestWebhook,
  MockKVNamespace,
  MockD1Database
} from '@hare/testing'
```
