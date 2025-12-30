# hare

Build AI agents on Cloudflare's edge network.

## Installation

```bash
npm install hare
# or
bun add hare
```

### Peer Dependencies

```bash
npm install ai zod agents
```

## Quick Start

### 1. Create a Simple Agent

```ts
import { createSimpleAgent, createWorkersAIModel } from 'hare'
import { getSystemTools } from 'hare/tools'

export default {
  async fetch(request: Request, env: Env) {
    const tools = getSystemTools({
      env,
      workspaceId: 'my-workspace',
      userId: 'user-123'
    })

    const agent = createSimpleAgent({
      model: createWorkersAIModel({
        modelId: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        ai: env.AI
      }),
      tools,
      systemPrompt: 'You are a helpful assistant.'
    })

    const response = await agent.chat('Hello!')
    return new Response(response.text)
  }
}
```

### 2. Use Durable Object Agents (Stateful)

```ts
import { HareAgent, routeToHareAgent } from 'hare/workers'

// Export the Durable Object class
export { HareAgent }

export default {
  async fetch(request: Request, env: Env) {
    return routeToHareAgent({
      request,
      env,
      agentId: 'my-agent'
    })
  }
}
```

### 3. Create Custom Tools

```ts
import { createTool, success, failure } from 'hare/tools'
import { z } from 'zod'

const weatherTool = createTool({
  id: 'get_weather',
  description: 'Get current weather for a location',
  inputSchema: z.object({
    city: z.string().describe('City name'),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius')
  }),
  execute: async (params, context) => {
    try {
      const weather = await fetchWeather(params.city, params.units)
      return success({ temperature: weather.temp, conditions: weather.conditions })
    } catch (error) {
      return failure(`Failed to fetch weather: ${error.message}`)
    }
  }
})
```

## Entry Points

| Import Path | Description |
|-------------|-------------|
| `hare` | Main entry - universal exports (HareEdgeAgent, tools, types) |
| `hare/workers` | Workers-only exports (HareAgent, HareMcpAgent with Durable Objects) |
| `hare/tools` | All 59+ tools organized by category |
| `hare/types` | Complete type definitions |

## Available Tools (59+)

### Cloudflare Native (17)
- **KV**: `kv_get`, `kv_put`, `kv_delete`, `kv_list`
- **R2**: `r2_get`, `r2_put`, `r2_delete`, `r2_list`, `r2_head`
- **SQL**: `sql_query`, `sql_execute`, `sql_batch`
- **HTTP**: `http_request`, `http_get`, `http_post`
- **Search**: `ai_search`, `ai_search_answer`

### AI Tools (8)
`sentiment`, `summarize`, `translate`, `image_generate`, `classify`, `ner`, `embedding`, `question_answer`

### Utility Tools (9)
`datetime`, `json`, `text`, `math`, `uuid`, `hash`, `base64`, `url`, `delay`

### Data Tools (7)
`rss`, `scrape`, `regex`, `crypto`, `json_schema`, `csv`, `template`

### Validation Tools (6)
`validate_email`, `validate_phone`, `validate_url`, `validate_credit_card`, `validate_ip`, `validate_json`

### Transform Tools (5)
`markdown`, `diff`, `qrcode`, `compression`, `color`

### Sandbox Tools (3)
`code_execute`, `code_validate`, `sandbox_file`

### Memory Tools (2)
`store_memory`, `recall_memory` (Vectorize)

### Integration Tools (2)
`zapier`, `webhook`

## Wrangler Configuration

```toml
# wrangler.toml
name = "my-agent"
main = "src/index.ts"

[durable_objects]
bindings = [
  { name = "HARE_AGENT", class_name = "HareAgent" }
]

[[migrations]]
tag = "v1"
new_classes = ["HareAgent"]

[ai]
binding = "AI"

[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"

[[d1_databases]]
binding = "DB"
database_name = "hare"
database_id = "your-d1-id"
```

## TypeScript Types

```ts
import type {
  HareAgentState,
  ToolContext,
  Tool,
  AnyTool,
  AgentConfig
} from 'hare/types'
```

## API Reference

### Agent Classes

- **`HareEdgeAgent`** - Universal agent (works anywhere)
- **`HareAgent`** - Cloudflare Durable Object agent with state persistence
- **`HareMcpAgent`** - MCP server agent for external AI clients

### Tool Factories

- **`createTool(config)`** - Create a type-safe tool
- **`getSystemTools(context)`** - Get all 59+ built-in tools
- **`getToolsByCategory({ category, context })`** - Get tools by category

### AI Model Providers

- **`createWorkersAIModel({ modelId, ai })`** - Create Workers AI model
- **`generateEmbedding({ text, model, ai })`** - Generate embeddings

### Memory Store

- **`createMemoryStore({ db })`** - Create D1-backed conversation memory
- **`D1MemoryStore`** - Direct memory store class

## License

MIT
