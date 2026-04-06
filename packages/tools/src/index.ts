/**
 * @hare/tools - AI agent tools for Cloudflare Workers
 *
 * A comprehensive library of 59 tools for building AI agents on Cloudflare's edge network.
 *
 * @example
 * ```ts
 * import { getSystemTools, createTool, success, failure } from '@hare/tools'
 *
 * // Get all system tools
 * const tools = getSystemTools({ env, workspaceId: 'ws-1', userId: 'user-1' })
 *
 * // Create a custom tool
 * const myTool = createTool({
 *   id: 'my_tool',
 *   description: 'Does something useful',
 *   inputSchema: z.object({ query: z.string() }),
 *   execute: async (params, ctx) => success({ result: 'done' })
 * })
 * ```
 */

// Types from @hare/types (canonical source)
export { type ToolConfig, ToolConfigSchema, type ToolType, ToolTypeSchema } from '@hare/types'
// Tool delegation utilities
export { delegateTo, delegateToWithValidation } from './delegate'
// Core types and utilities
export {
	type AnyTool,
	createRegistry,
	createTool,
	failure,
	type HareEnv,
	success,
	type Tool,
	type ToolContext,
	type ToolDefinition,
	ToolRegistry,
	type ToolResult,
	type ToolSet,
	toToolSet,
} from './types'

// ==========================================
// CLOUDFLARE NATIVE TOOLS
// ==========================================

// HTTP tools
export {
	getHTTPTools,
	HttpResponseOutputSchema,
	httpGetTool,
	httpPostTool,
	httpRequestTool,
} from './http'
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
// INTEGRATION TOOLS
// ==========================================

export {
	getIntegrationTools,
	webhookTool,
	zapierDeleteTool,
	zapierListTool,
	zapierSaveTool,
	zapierTestTool,
	zapierTool,
	zapierTriggerTool,
} from './integrations'

// ==========================================
// BROWSER TOOLS (Browser Rendering)
// Note: Browser tools use @cloudflare/puppeteer which requires node:buffer.
// They cannot be imported in client bundles. Use getBrowserTools() from
// '@hare/tools/browser' server-side only.
// ==========================================

// ==========================================
// SECURITY (SSRF Protection)
// ==========================================

// Constants
export {
	AutoRAGConfig,
	ContentLengths,
	ContentTypes,
	ImageGeneration,
	ListLimits,
	Radix,
	SandboxLimits,
	ScrapeLimits,
	StoragePrefixes,
	Timeouts,
	UserAgents,
	ValidationLimits,
	ZapierConfig,
} from './constants'
export {
	isBlockedHost,
	isPrivateIPv4,
	isPrivateIPv6,
	isRedirectSafe,
	isUrlSafe,
	MAX_REDIRECT_HOPS,
	parseIPv4,
} from './security/ssrf'

// ==========================================
// AI TOOLS (Workers AI)
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
// SANDBOX TOOLS
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
// MEMORY TOOLS (Vectorize)
// ==========================================

export { getMemoryTools, recallMemoryTool, storeMemoryTool } from './memory'

// ==========================================
// AGENT CONTROL TOOLS (MCP)
// ==========================================

export {
	AGENT_CONTROL_TOOL_IDS,
	type AgentControlToolId,
	agentControlTools,
	configureAgentTool,
	createAgentTool,
	createWebhookTool,
	deleteAgentTool,
	deleteWebhookTool,
	deployAgentTool,
	type ExecutableTool,
	executeToolTool,
	getAgentControlTools,
	getAgentMetricsTool,
	getAgentTool,
	listAgentsTool,
	listAgentToolsTool,
	listWebhooksTool,
	rollbackAgentTool,
	scheduleTaskTool,
	sendMessageTool,
	undeployAgentTool,
} from './agent-control'

// ==========================================
// AGENT BUILDER TOOLS
// ==========================================

export {
	AGENT_BUILDER_TOOL_IDS,
	type AgentBuilderToolId,
	agentBuilderTools,
	agentExportConfigTool,
	agentListModelsTool,
	agentListTemplatesTool,
	agentSuggestToolsTool,
	agentValidateConfigTool,
	getAgentBuilderTools,
} from './agent-builder'

// ==========================================
// TOOL FACTORY (Database Loading)
// ==========================================

export {
	createToolFromConfig,
	type LoadAgentToolsInput,
	loadAgentTools,
	type ToolDatabase,
} from './factory'

// ==========================================
// TOOL AGGREGATION
// ==========================================

import { getAITools } from './ai'
// Browser tools loaded lazily — they use @cloudflare/puppeteer (node:buffer)
// which breaks client-side Vite builds. Only loaded server-side.
import { getDataTools } from './data'
import { getHTTPTools } from './http'
import { getIntegrationTools } from './integrations'
import { getKVTools } from './kv'
import { getMemoryTools } from './memory'
import { getR2Tools } from './r2'
import { getSandboxTools } from './sandbox'
import { getSearchTools } from './search'
import { getSQLTools } from './sql'
import { getTransformTools } from './transform'
import type { AnyTool, ToolContext } from './types'
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
	| 'memory'
	| 'browser'
	| 'all'

/**
 * Get all system tools available to agents.
 * This includes all built-in tools across all categories.
 *
 * @example
 * ```ts
 * const tools = getSystemTools({
 *   env: { AI: env.AI, KV: env.KV },
 *   workspaceId: 'my-workspace',
 *   userId: 'user-123'
 * })
 * ```
 */
export function getSystemTools(context: ToolContext): AnyTool[] {
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
		// Memory tools (Vectorize)
		...getMemoryTools(context),
		// Browser tools excluded from default getSystemTools — loaded lazily server-side
		// to avoid bundling @cloudflare/puppeteer in client builds.
	]
}

/**
 * Get tools by category.
 *
 * @example
 * ```ts
 * const aiTools = getToolsByCategory('ai', context)
 * const storageTools = getToolsByCategory('storage', context)
 * ```
 */
export function getToolsByCategory({
	category,
	context,
}: {
	category: ToolCategory
	context: ToolContext
}): AnyTool[] {
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
		case 'memory':
			return getMemoryTools(context)
		case 'browser':
			// Browser tools must be loaded server-side only via dynamic import
			return []
		default:
			return getSystemTools(context)
	}
}

/**
 * Get a map of all system tool IDs to their tools.
 */
export function getSystemToolsMap(context: ToolContext): Map<string, AnyTool> {
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
	// Memory (Vectorize)
	'recall_memory',
	'store_memory',
	// Browser (Browser Rendering)
	'browse_url',
	'screenshot',
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
	integrations: 2, // Zapier (all externals) + generic webhook
	ai: 8,
	data: 7,
	sandbox: 3,
	validation: 6,
	transform: 5,
	memory: 2, // recall_memory, store_memory
	browser: 2, // browse_url, screenshot
	total: 61,
} as const
