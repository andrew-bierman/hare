/**
 * Native Cloudflare Tools
 *
 * Edge-compatible tool implementations for Cloudflare Workers.
 * Includes system tools, utility tools, AI tools, integration tools, and data tools.
 */

// Tool factory
export { loadAgentTools } from './factory'
// Types and utilities
export {
	createTool,
	failure,
	success,
	type Tool,
	type ToolConfig,
	type ToolContext,
	type ToolResult,
	type ToolType,
} from './types'

// ==========================================
// SYSTEM TOOLS (Cloudflare Native)
// ==========================================

// HTTP tools
export { getHTTPTools, httpGetTool, httpPostTool, httpRequestTool } from './http'
// KV tools
export { getKVTools, kvDeleteTool, kvGetTool, kvListTool, kvPutTool } from './kv'
// R2 tools
export { getR2Tools, r2DeleteTool, r2GetTool, r2HeadTool, r2ListTool, r2PutTool } from './r2'
// Search tools (AutoRAG/AI Search)
export { aiSearchAnswerTool, aiSearchTool, getSearchTools } from './search'
// SQL tools
export { getSQLTools, sqlBatchTool, sqlExecuteTool, sqlQueryTool } from './sql'

// ==========================================
// UTILITY TOOLS
// ==========================================

export {
	base64Tool,
	datetimeTool,
	delayTool,
	getUtilityTools,
	hashTool,
	jsonTool,
	mathTool,
	textTool,
	urlTool,
	uuidTool,
} from './utility'

// ==========================================
// INTEGRATION TOOLS (Zapier = single hub for all externals)
// ==========================================

export {
	getIntegrationTools,
	webhookTool,
	// Zapier integration management
	zapierDeleteTool,
	zapierListTool,
	zapierSaveTool,
	zapierTestTool,
	zapierTool,
	zapierTriggerTool,
} from './integrations'

// ==========================================
// AI TOOLS
// ==========================================

export {
	classifyTool,
	embeddingTool,
	getAITools,
	imageGenerateTool,
	nerTool,
	qaTool,
	sentimentTool,
	summarizeTool,
	translateTool,
} from './ai'

// ==========================================
// DATA TOOLS
// ==========================================

export {
	cryptoTool,
	csvTool,
	getDataTools,
	jsonSchemaTool,
	regexTool,
	rssTool,
	scrapeTool,
	templateTool,
} from './data'

// ==========================================
// SANDBOX TOOLS (Cloudflare Sandbox SDK)
// ==========================================

export {
	codeExecuteTool,
	codeValidateTool,
	executeSandboxed,
	getSandboxTools,
	sandboxFileTool,
} from './sandbox'

// ==========================================
// VALIDATION TOOLS
// ==========================================

export {
	getValidationTools,
	validateCreditCardTool,
	validateEmailTool,
	validateIpTool,
	validateJsonTool,
	validatePhoneTool,
	validateUrlTool,
} from './validation'

// ==========================================
// TRANSFORM TOOLS
// ==========================================

export {
	colorTool,
	compressionTool,
	diffTool,
	getTransformTools,
	markdownTool,
	qrcodeTool,
} from './transform'

// ==========================================
// TOOL AGGREGATION
// ==========================================

import { getAITools } from './ai'
import { getDataTools } from './data'
import { getHTTPTools } from './http'
import { getIntegrationTools } from './integrations'
import { getKVTools } from './kv'
import { getR2Tools } from './r2'
import { getSandboxTools } from './sandbox'
import { getSearchTools } from './search'
import { getSQLTools } from './sql'
import { getTransformTools } from './transform'
import type { Tool, ToolContext } from './types'
import { getUtilityTools } from './utility'
import { getValidationTools } from './validation'

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
			return getSearchTools(context)
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
	'kv_get',
	'kv_put',
	'kv_delete',
	'kv_list',
	'r2_get',
	'r2_put',
	'r2_delete',
	'r2_list',
	'r2_head',
	'sql_query',
	'sql_execute',
	'sql_batch',
	'http_request',
	'http_get',
	'http_post',
	'ai_search',
	'ai_search_answer',
	// Utility
	'datetime',
	'json',
	'text',
	'math',
	'uuid',
	'hash',
	'base64',
	'url',
	'delay',
	// Integrations (Zapier = single hub for externals)
	'zapier',
	'zapier_save',
	'zapier_list',
	'zapier_trigger',
	'zapier_delete',
	'zapier_test',
	'webhook',
	// AI (Workers AI - no external APIs)
	'sentiment',
	'summarize',
	'translate',
	'image_generate',
	'classify',
	'ner',
	'embedding',
	'question_answer',
	// Data
	'rss',
	'scrape',
	'regex',
	'crypto',
	'json_schema',
	'csv',
	'template',
	// Sandbox (Cloudflare Sandbox SDK)
	'code_execute',
	'code_validate',
	'sandbox_file',
	// Validation
	'validate_email',
	'validate_phone',
	'validate_url',
	'validate_credit_card',
	'validate_ip',
	'validate_json',
	// Transform
	'markdown',
	'diff',
	'qrcode',
	'compression',
	'color',
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
	cloudflare: 17, // KV(4), R2(5), SQL(3), HTTP(3), Search(2)
	utility: 9,
	integrations: 7, // Zapier (6: legacy + save/list/trigger/delete/test) + generic webhook
	ai: 8,
	data: 7,
	sandbox: 3,
	validation: 6,
	transform: 5,
	total: 62,
} as const
