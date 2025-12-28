/**
 * System Tools Configuration
 */

import { DEFAULT_MODEL_ID } from './models'

// =============================================================================
// System Tools
// =============================================================================

export type SystemToolType = 'http' | 'sql' | 'kv' | 'r2' | 'search' | 'browser'

export interface SystemTool {
	type: SystemToolType
	name: string
	description: string
	icon: string
	available: boolean
	requiredBinding?: string
}

export const SYSTEM_TOOLS: SystemTool[] = [
	{
		type: 'http',
		name: 'HTTP Requests',
		description: 'Make HTTP requests to external APIs and services',
		icon: 'Globe',
		available: true,
	},
	{
		type: 'sql',
		name: 'D1 Database',
		description: 'Query and modify data in Cloudflare D1 SQLite databases',
		icon: 'Database',
		available: true,
		requiredBinding: 'DB',
	},
	{
		type: 'kv',
		name: 'KV Storage',
		description: 'Read and write to Cloudflare Workers KV key-value store',
		icon: 'Key',
		available: true,
		requiredBinding: 'KV',
	},
	{
		type: 'r2',
		name: 'R2 Storage',
		description: 'Store and retrieve files from Cloudflare R2 object storage',
		icon: 'HardDrive',
		available: true,
		requiredBinding: 'R2',
	},
	{
		type: 'search',
		name: 'AI Search',
		description: 'Semantic search using Cloudflare AI Search (AutoRAG)',
		icon: 'Sparkles',
		available: true,
		requiredBinding: 'AI',
	},
	{
		type: 'browser',
		name: 'Browser Automation',
		description: 'Automate browser interactions using Cloudflare Browser Rendering',
		icon: 'Monitor',
		available: false,
		requiredBinding: 'BROWSER',
	},
] as const

export function getAvailableTools(): SystemTool[] {
	return SYSTEM_TOOLS.filter((t) => t.available)
}

// =============================================================================
// Agent Configuration
// =============================================================================

// AgentStatus is exported from shared/api/types.ts to avoid duplicate exports
import type { AgentStatus } from '../api/types'

export type { AgentStatus }

export interface AgentDefaults {
	model: string
	temperature: number
	maxTokens: number
	status: AgentStatus
}

export const AGENT_DEFAULTS: AgentDefaults = {
	model: DEFAULT_MODEL_ID,
	temperature: 0.7,
	maxTokens: 4096,
	status: 'draft',
}

export const AGENT_LIMITS = {
	nameMinLength: 1,
	nameMaxLength: 100,
	descriptionMaxLength: 500,
	instructionsMaxLength: 10000,
	maxToolsPerAgent: 20,
} as const
