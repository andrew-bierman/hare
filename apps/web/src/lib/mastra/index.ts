import { Agent } from '@mastra/core'

export interface AgentConfig {
  id: string
  name: string
  model: string
  instructions: string
  tools?: ToolConfig[]
  memory?: MemoryConfig
}

export interface ToolConfig {
  id: string
  name: string
  description: string
  type: 'http' | 'sql' | 'search' | 'custom'
  config: Record<string, unknown>
}

export interface MemoryConfig {
  enabled: boolean
  maxMessages: number
}

export function createAgent(config: AgentConfig, env: CloudflareEnv): Agent {
  return new Agent({
    name: config.name,
    instructions: config.instructions,
    model: {
      provider: 'cloudflare',
      name: config.model,
    },
  })
}
