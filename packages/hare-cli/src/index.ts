#!/usr/bin/env node
/**
 * @hare/cli - CLI for scaffolding Hare AI agent projects
 *
 * Usage:
 *   npx @hare/cli init my-agent
 *   npx create-hare-agent my-agent
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TEMPLATES = {
	'package.json': (name: string) => `{
  "name": "${name}",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@hare/agent": "^0.1.0",
    "@hare/tools": "^0.1.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20251224.0",
    "typescript": "^5.7.0",
    "wrangler": "^4.0.0"
  }
}
`,

	'wrangler.toml': (name: string) => `name = "${name}"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true

# Durable Objects for stateful agents
[durable_objects]
bindings = [
  { name = "HARE_AGENT", class_name = "HareAgent" }
]

[[migrations]]
tag = "v1"
new_classes = ["HareAgent"]

# Workers AI (required)
[ai]
binding = "AI"

# =========================================
# Optional bindings - uncomment as needed
# =========================================

# KV Namespace for key-value storage
# [[kv_namespaces]]
# binding = "KV"
# id = "your-kv-namespace-id"

# R2 Bucket for file storage
# [[r2_buckets]]
# binding = "R2"
# bucket_name = "your-bucket-name"

# D1 Database for SQL storage
# [[d1_databases]]
# binding = "DB"
# database_name = "your-database"
# database_id = "your-database-id"

# Vectorize for semantic search/RAG
# [[vectorize]]
# binding = "VECTORIZE"
# index_name = "your-index"
`,

	'src/index.ts': (_name: string) => `/**
 * Hare AI Agent Worker
 *
 * This is your agent's entry point. Export the HareAgent class
 * and route requests to your Durable Object.
 */

import { HareAgent } from '@hare/agent/workers'
import { getSystemTools } from '@hare/tools'

// Re-export the agent class for Durable Object binding
export { HareAgent }

// Define your environment bindings
interface Env {
  AI: Ai
  HARE_AGENT: DurableObjectNamespace
  // Optional bindings
  KV?: KVNamespace
  R2?: R2Bucket
  DB?: D1Database
  VECTORIZE?: VectorizeIndex
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // Health check
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' })
    }

    // Route to agent - use 'default' as the agent ID for single-agent setup
    // For multi-agent, extract ID from URL: /agents/:id
    const agentId = url.pathname.match(/^\\/agents\\/([^/]+)/)?.[1] || 'default'

    const id = env.HARE_AGENT.idFromName(agentId)
    const agent = env.HARE_AGENT.get(id)

    return agent.fetch(request)
  },
}
`,

	'src/custom-agent.ts': (_name: string) => `/**
 * Custom Agent Example
 *
 * Extend HareAgent to customize behavior, add tools, or modify the system prompt.
 */

import { HareAgent, type HareAgentState } from '@hare/agent/workers'
import { createTool, success, failure, getUtilityTools, getAITools } from '@hare/tools'
import { z } from 'zod'

/**
 * Custom agent with specific tools and configuration.
 */
export class MyCustomAgent extends HareAgent {
  // Override initial state with custom configuration
  override initialState: HareAgentState = {
    ...super.initialState,
    name: 'My Custom Agent',
    instructions: \`You are a helpful assistant specialized in [your domain].

Be concise, accurate, and helpful. Use the available tools when appropriate.\`,
    model: 'llama-3.3-70b',
  }

  // Override onStart to customize tool loading
  override async onStart(): Promise<void> {
    // Get tool context
    const ctx = this.createToolContext()

    // Load only specific tool categories
    const tools = [
      ...getUtilityTools(ctx),
      ...getAITools(ctx),
      // Add your custom tools here
      this.createGreetingTool(),
    ]

    for (const tool of tools) {
      this.tools.set(tool.id, tool)
    }
  }

  // Example custom tool
  private createGreetingTool() {
    return createTool({
      id: 'greet_user',
      description: 'Send a personalized greeting to a user',
      inputSchema: z.object({
        name: z.string().describe('Name of the user to greet'),
        style: z.enum(['formal', 'casual', 'enthusiastic']).optional().default('casual'),
      }),
      execute: async (params, _ctx) => {
        const { name, style } = params

        let greeting: string
        switch (style) {
          case 'formal':
            greeting = \`Good day, \${name}. How may I assist you?\`
            break
          case 'enthusiastic':
            greeting = \`Hey \${name}! Great to see you! What can I help with today?!\`
            break
          default:
            greeting = \`Hi \${name}! How can I help you today?\`
        }

        return success({ greeting, timestamp: new Date().toISOString() })
      },
    })
  }
}
`,

	'tsconfig.json': (_name: string) => `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
`,

	'README.md': (name: string) => `# ${name}

A Hare AI Agent powered by Cloudflare Workers.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy
npm run deploy
\`\`\`

## Project Structure

\`\`\`
${name}/
├── src/
│   ├── index.ts        # Worker entry point
│   └── custom-agent.ts # Example custom agent
├── wrangler.toml       # Cloudflare config
├── tsconfig.json       # TypeScript config
└── package.json
\`\`\`

## Configuration

Edit \`wrangler.toml\` to configure:

- **AI binding**: Required for LLM capabilities
- **KV**: Key-value storage (optional)
- **R2**: Object storage (optional)
- **D1**: SQL database (optional)
- **Vectorize**: Vector search for RAG (optional)

## Customization

See \`src/custom-agent.ts\` for an example of extending \`HareAgent\` with:

- Custom system prompts
- Specific tool selections
- Custom tools

## API

### WebSocket Chat

\`\`\`javascript
const ws = new WebSocket('ws://localhost:8787/agents/default')

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  console.log(message)
}

ws.send(JSON.stringify({
  type: 'chat',
  payload: { message: 'Hello!', userId: 'user-1' }
}))
\`\`\`

### HTTP Chat (SSE)

\`\`\`bash
curl -X POST http://localhost:8787/agents/default/chat \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello!", "userId": "user-1"}'
\`\`\`

## Learn More

- [Hare Documentation](https://github.com/your-org/hare)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)
`,
}

function init(projectName: string) {
	const projectDir = join(process.cwd(), projectName)

	if (existsSync(projectDir)) {
		console.error(`Error: Directory "${projectName}" already exists.`)
		process.exit(1)
	}

	console.log(`Creating Hare agent project: ${projectName}`)

	// Create directories
	mkdirSync(projectDir, { recursive: true })
	mkdirSync(join(projectDir, 'src'), { recursive: true })

	// Write files
	for (const [filename, template] of Object.entries(TEMPLATES)) {
		const content = template(projectName)
		const filePath = join(projectDir, filename)
		writeFileSync(filePath, content)
		console.log(`  Created ${filename}`)
	}

	console.log(`
Done! Next steps:

  cd ${projectName}
  npm install
  npm run dev

Your agent will be running at http://localhost:8787
`)
}

// CLI entry point
const args = process.argv.slice(2)
const command = args[0]

if (command === 'init' && args[1]) {
	init(args[1])
} else if (command && command !== 'init') {
	// Assume it's a project name (for create-hare-agent usage)
	init(command)
} else {
	console.log(`
Usage:
  npx @hare/cli init <project-name>
  npx create-hare-agent <project-name>

Example:
  npx @hare/cli init my-agent
  cd my-agent
  npm install
  npm run dev
`)
}
