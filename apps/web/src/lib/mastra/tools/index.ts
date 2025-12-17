/**
 * Native Cloudflare Tools
 *
 * Edge-compatible tool implementations for Cloudflare Workers.
 */

// Types and utilities
export { createTool, success, failure, type Tool, type ToolContext, type ToolConfig, type ToolResult } from './types'

// Tool factory
export { loadAgentTools } from './factory'

// KV tools
export { kvGetTool, kvPutTool, kvDeleteTool, kvListTool, getKVTools } from './kv'

// R2 tools
export { r2GetTool, r2PutTool, r2DeleteTool, r2ListTool, r2HeadTool, getR2Tools } from './r2'

// SQL tools
export { sqlQueryTool, sqlExecuteTool, sqlBatchTool, getSQLTools } from './sql'

// Vectorize tools
export { vectorizeInsertTool, vectorizeQueryTool, vectorizeDeleteTool, vectorizeGetTool, getVectorizeTools } from './vectorize'

// HTTP tools
export { httpRequestTool, httpGetTool, httpPostTool, getHTTPTools } from './http'

// Search tools
export { semanticSearchTool, memorySearchTool, getSearchTools } from './search'

import { type Tool, type ToolContext } from './types'
import { getKVTools } from './kv'
import { getR2Tools } from './r2'
import { getSQLTools } from './sql'
import { getVectorizeTools } from './vectorize'
import { getHTTPTools } from './http'
import { getSearchTools } from './search'

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
	context: ToolContext
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
		case 'all':
		default:
			return getSystemTools(context)
	}
}
