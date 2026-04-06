/**
 * hareai - Build AI agents on Cloudflare's edge network
 *
 * This is the main entry point for the Hare SDK. It exports everything you need
 * to build AI agents that run on Cloudflare Workers.
 *
 * @example
 * ```ts
 * // Universal imports (safe in any environment)
 * import {
 *   HareEdgeAgent,
 *   createHareEdgeAgent,
 *   createWorkersAIModel,
 *   getSystemTools,
 *   createTool
 * } from 'hareai'
 *
 * // Workers-only imports (Durable Objects)
 * import { HareAgent, HareMcpAgent } from 'hareai/workers'
 *
 * // Tool-specific imports
 * import { getKVTools, getAITools } from 'hareai/tools'
 *
 * // Type imports
 * import type { HareAgentState, ToolContext } from 'hareai/types'
 * ```
 *
 * @packageDocumentation
 */

// ============================================
// AGENT EXPORTS (Universal)
// ============================================

// Agent state types
export type {
	AgentConfig,
	AgentOptions,
	AgentRouteConfig,
	AgentStreamResponse,
	AgentTool,
	ChatPayload,
	ClientMessage,
	ConversationMessage,
	CreateAgentFromConfigInput,
	CreateSimpleAgentInput,
	CreateWorkersAIModelInput,
	EmbeddingModelId,
	GenerateEmbeddingInput,
	GenerateEmbeddingsInput,
	GetMessagesInput,
	GetOrCreateConversationInput,
	HareAgentEnv,
	HareAgentState,
	LoadAgentToolsInput,
	McpAgentState,
	MemoryStore,
	MessageRole,
	RouteHttpToAgentInput,
	RouteToHareAgentInput,
	RouteToMcpAgentInput,
	RouteWebSocketToAgentInput,
	SaveMessageInput,
	ScheduledTask,
	SchedulePayload,
	SearchMessagesInput,
	ServerMessage,
	ToolExecutePayload,
	WorkersAIModelId,
} from '@hare/agent'
// Core agent classes
// Router utilities
// Workers AI Provider
// Memory store
// Agent factory
export {
	createAgentFromConfig,
	createAgentHeaders,
	createEdgeAgent,
	createHareEdgeAgent,
	createMemoryStore,
	createSimpleAgent,
	createWorkersAIModel,
	D1MemoryStore,
	DEFAULT_HARE_AGENT_STATE,
	DEFAULT_MCP_AGENT_STATE,
	EdgeAgent,
	EMBEDDING_MODELS,
	generateEmbedding,
	generateEmbeddings,
	getAgentIdFromRequest,
	getAvailableModels,
	getWorkersAIModelId,
	HareEdgeAgent,
	isWebSocketRequest,
	loadAgentTools,
	routeHttpToAgent,
	routeToHareAgent,
	routeToMcpAgent,
	routeWebSocketToAgent,
	toAgentMessages,
	WORKERS_AI_MODELS,
} from '@hare/agent'

// ============================================
// TOOL EXPORTS (Most common)
// ============================================

export type {
	AnyTool,
	HareEnv,
	SystemToolId,
	Tool,
	ToolCategory,
	ToolContext,
	ToolDefinition,
	ToolResult,
} from '@hare/tools'
// Core tool utilities
// Tool aggregation
// Tool delegation
export {
	createRegistry,
	createTool,
	delegateTo,
	delegateToWithValidation,
	failure,
	getSystemTools,
	getSystemToolsMap,
	getToolsByCategory,
	isSystemTool,
	SYSTEM_TOOL_IDS,
	success,
	TOOL_COUNTS,
	ToolRegistry,
} from '@hare/tools'

// ============================================
// TYPE EXPORTS (Most common)
// ============================================

export type {
	Agent,
	AgentConfig as AgentConfigType,
	AgentStatus,
	ApiError,
	ApiSuccess,
	ToolConfig,
	ToolType,
} from '@hare/types'
// Tool configuration types
// Agent configuration types
// API types
export {
	AgentConfigSchema,
	AgentSchema,
	AgentStatusSchema,
	ApiErrorSchema,
	ApiSuccessSchema,
	ToolConfigSchema,
	ToolTypeSchema,
} from '@hare/types'
