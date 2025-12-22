/**
 * Native Cloudflare Tools
 *
 * Edge-compatible tool implementations for Cloudflare Workers.
 * Includes system tools, utility tools, AI tools, integration tools, and data tools.
 */

// Types and utilities
export { createTool, success, failure, type Tool, type ToolContext, type ToolConfig, type ToolResult, type ToolType } from './types'

// Tool factory
export { loadAgentTools } from './factory'

// ==========================================
// SYSTEM TOOLS (Cloudflare Native)
// ==========================================

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

// ==========================================
// UTILITY TOOLS
// ==========================================

export {
	datetimeTool,
	jsonTool,
	textTool,
	mathTool,
	uuidTool,
	hashTool,
	base64Tool,
	urlTool,
	delayTool,
	getUtilityTools,
} from './utility'

// ==========================================
// INTEGRATION TOOLS (Zapier = single hub for all externals)
// ==========================================

export {
	zapierTool,
	webhookTool,
	getIntegrationTools,
} from './integrations'

// ==========================================
// AI TOOLS
// ==========================================

export {
	sentimentTool,
	summarizeTool,
	translateTool,
	imageGenerateTool,
	classifyTool,
	nerTool,
	embeddingTool,
	qaTool,
	getAITools,
} from './ai'

// ==========================================
// DATA TOOLS
// ==========================================

export {
	rssTool,
	scrapeTool,
	regexTool,
	cryptoTool,
	jsonSchemaTool,
	csvTool,
	templateTool,
	getDataTools,
} from './data'

// ==========================================
// SANDBOX TOOLS (Cloudflare Sandbox SDK)
// ==========================================

export {
	codeExecuteTool,
	codeValidateTool,
	sandboxFileTool,
	getSandboxTools,
	executeSandboxed,
} from './sandbox'

// ==========================================
// VALIDATION TOOLS
// ==========================================

export {
	validateEmailTool,
	validatePhoneTool,
	validateUrlTool,
	validateCreditCardTool,
	validateIpTool,
	validateJsonTool,
	getValidationTools,
} from './validation'

// ==========================================
// TRANSFORM TOOLS
// ==========================================

export {
	markdownTool,
	diffTool,
	qrcodeTool,
	compressionTool,
	colorTool,
	getTransformTools,
} from './transform'

// ==========================================
// TOOL AGGREGATION
// ==========================================

import { type Tool, type ToolContext } from './types'
import { getKVTools } from './kv'
import { getR2Tools } from './r2'
import { getSQLTools } from './sql'
import { getVectorizeTools } from './vectorize'
import { getHTTPTools } from './http'
import { getSearchTools } from './search'
import { getUtilityTools } from './utility'
import { getIntegrationTools } from './integrations'
import { getAITools } from './ai'
import { getDataTools } from './data'
import { getSandboxTools } from './sandbox'
import { getValidationTools } from './validation'
import { getTransformTools } from './transform'

/**
 * Tool categories for organization and filtering.
 */
export type ToolCategory =
	| 'storage'
	| 'database'
	| 'search'
	| 'http'
	| 'utility'
	| 'integrations'
	| 'ai'
	| 'data'
	| 'sandbox'
	| 'validation'
	| 'transform'
	| 'all'

/**
 * Get all system tools available to agents.
 * This includes all built-in tools across all categories.
 */
export function getSystemTools(context: ToolContext): Tool[] {
	return [
		// Cloudflare native tools
		...getKVTools(context),
		...getR2Tools(context),
		...getSQLTools(context),
		...getVectorizeTools(context),
		...getHTTPTools(context),
		...getSearchTools(context),
		// Utility tools
		...getUtilityTools(context),
		// Integration tools
		...getIntegrationTools(context),
		// AI tools
		...getAITools(context),
		// Data tools
		...getDataTools(context),
		// Sandbox tools
		...getSandboxTools(context),
		// Validation tools
		...getValidationTools(context),
		// Transform tools
		...getTransformTools(context),
	]
}

/**
 * Get tools by category.
 */
export function getToolsByCategory(category: ToolCategory, context: ToolContext): Tool[] {
	switch (category) {
		case 'storage':
			return [...getKVTools(context), ...getR2Tools(context)]
		case 'database':
			return getSQLTools(context)
		case 'search':
			return [...getVectorizeTools(context), ...getSearchTools(context)]
		case 'http':
			return getHTTPTools(context)
		case 'utility':
			return getUtilityTools(context)
		case 'integrations':
			return getIntegrationTools(context)
		case 'ai':
			return getAITools(context)
		case 'data':
			return getDataTools(context)
		case 'sandbox':
			return getSandboxTools(context)
		case 'validation':
			return getValidationTools(context)
		case 'transform':
			return getTransformTools(context)
		case 'all':
		default:
			return getSystemTools(context)
	}
}

/**
 * Get a map of all system tool IDs to their tools.
 */
export function getSystemToolsMap(context: ToolContext): Map<string, Tool> {
	const tools = getSystemTools(context)
	return new Map(tools.map((tool) => [tool.id, tool]))
}

/**
 * List of all system tool IDs.
 */
export const SYSTEM_TOOL_IDS = [
	// Cloudflare native
	'kv_get', 'kv_put', 'kv_delete', 'kv_list',
	'r2_get', 'r2_put', 'r2_delete', 'r2_list', 'r2_head',
	'sql_query', 'sql_execute', 'sql_batch',
	'vectorize_insert', 'vectorize_query', 'vectorize_delete', 'vectorize_get',
	'http_request', 'http_get', 'http_post',
	'semantic_search', 'memory_search',
	// Utility
	'datetime', 'json', 'text', 'math', 'uuid', 'hash', 'base64', 'url', 'delay',
	// Integrations (Zapier = single hub for externals)
	'zapier', 'webhook',
	// AI (Workers AI - no external APIs)
	'sentiment', 'summarize', 'translate', 'image_generate', 'classify', 'ner', 'embedding', 'question_answer',
	// Data
	'rss', 'scrape', 'regex', 'crypto', 'json_schema', 'csv', 'template',
	// Sandbox (Cloudflare Sandbox SDK)
	'code_execute', 'code_validate', 'sandbox_file',
	// Validation
	'validate_email', 'validate_phone', 'validate_url', 'validate_credit_card', 'validate_ip', 'validate_json',
	// Transform
	'markdown', 'diff', 'qrcode', 'compression', 'color',
] as const

export type SystemToolId = (typeof SYSTEM_TOOL_IDS)[number]

/**
 * Check if a tool ID is a system tool.
 */
export function isSystemTool(toolId: string): toolId is SystemToolId {
	return SYSTEM_TOOL_IDS.includes(toolId as SystemToolId)
}

/**
 * Tool count by category (for documentation)
 */
export const TOOL_COUNTS = {
	cloudflare: 21, // KV, R2, SQL, Vectorize, HTTP, Search
	utility: 9,
	integrations: 2, // Zapier (all externals) + generic webhook
	ai: 8,
	data: 7,
	sandbox: 3,
	validation: 6,
	transform: 5,
	total: 61,
} as const
