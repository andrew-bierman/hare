/**
 * Native Cloudflare Tools
 *
 * Edge-compatible tool implementations for Cloudflare Workers.
 */

// Tool factory
export { loadAgentTools } from './factory'
// HTTP tools
export { getHTTPTools, httpGetTool, httpPostTool, httpRequestTool } from './http'

// KV tools
export { getKVTools, kvDeleteTool, kvGetTool, kvListTool, kvPutTool } from './kv'

// R2 tools
export { getR2Tools, r2DeleteTool, r2GetTool, r2HeadTool, r2ListTool, r2PutTool } from './r2'
// Search tools
export { getSearchTools, memorySearchTool, semanticSearchTool } from './search'
// SQL tools
export { getSQLTools, sqlBatchTool, sqlExecuteTool, sqlQueryTool } from './sql'
// Types and utilities
export {
	createTool,
	failure,
	success,
	type Tool,
	type ToolConfig,
	type ToolContext,
	type ToolResult,
} from './types'
// Vectorize tools
export {
	getVectorizeTools,
	vectorizeDeleteTool,
	vectorizeGetTool,
	vectorizeInsertTool,
	vectorizeQueryTool,
} from './vectorize'

import { getHTTPTools } from './http'
import { getKVTools } from './kv'
import { getR2Tools } from './r2'
import { getSearchTools } from './search'
import { getSQLTools } from './sql'
import type { Tool, ToolContext } from './types'
import { getVectorizeTools } from './vectorize'

/**
 * Get all system tools available to agents.
 */
export function getSystemTools(context: ToolContext): Tool[] {
	return [
		...getKVTools(context),
		...getR2Tools(context),
		...getSQLTools(context),
		...getVectorizeTools(context),
		...getHTTPTools(context),
		...getSearchTools(context),
	]
}

/**
 * Get tools by category.
 */
export function getToolsByCategory(
	category: 'storage' | 'database' | 'search' | 'http' | 'all',
	context: ToolContext,
): Tool[] {
	switch (category) {
		case 'storage':
			return [...getKVTools(context), ...getR2Tools(context)]
		case 'database':
			return getSQLTools(context)
		case 'search':
			return [...getVectorizeTools(context), ...getSearchTools(context)]
		case 'http':
			return getHTTPTools(context)
		default:
			return getSystemTools(context)
	}
}
