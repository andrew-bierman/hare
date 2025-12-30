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

// Core agent classes
export { HareEdgeAgent, createHareEdgeAgent, EdgeAgent, createEdgeAgent } from '@hare/agent'
export type { AgentTool, AgentOptions, AgentStreamResponse } from '@hare/agent'

// Agent state types
export type {
	HareAgentState,
	McpAgentState,
	ClientMessage,
	ServerMessage,
	ChatPayload,
	ToolExecutePayload,
	SchedulePayload,
	ScheduledTask,
} from '@hare/agent'

export { DEFAULT_HARE_AGENT_STATE, DEFAULT_MCP_AGENT_STATE } from '@hare/agent'

// Router utilities
export {
	routeToHareAgent,
	routeToMcpAgent,
	routeWebSocketToAgent,
	routeHttpToAgent,
	isWebSocketRequest,
	getAgentIdFromRequest,
	createAgentHeaders,
} from '@hare/agent'
export type {
	HareAgentEnv,
	AgentRouteConfig,
	RouteToHareAgentInput,
	RouteToMcpAgentInput,
	RouteWebSocketToAgentInput,
	RouteHttpToAgentInput,
} from '@hare/agent'

// Workers AI Provider
export {
	createWorkersAIModel,
	getWorkersAIModelId,
	getAvailableModels,
	generateEmbedding,
	generateEmbeddings,
	WORKERS_AI_MODELS,
	EMBEDDING_MODELS,
} from '@hare/agent'
export type {
	WorkersAIModelId,
	EmbeddingModelId,
	CreateWorkersAIModelInput,
	GenerateEmbeddingInput,
	GenerateEmbeddingsInput,
} from '@hare/agent'

// Memory store
export { createMemoryStore, toAgentMessages, D1MemoryStore } from '@hare/agent'
export type {
	MessageRole,
	ConversationMessage,
	SaveMessageInput,
	GetMessagesInput,
	GetOrCreateConversationInput,
	SearchMessagesInput,
	MemoryStore,
} from '@hare/agent'

// Agent factory
export { createAgentFromConfig, createSimpleAgent, loadAgentTools } from '@hare/agent'
export type {
	AgentConfig,
	CreateAgentFromConfigInput,
	CreateSimpleAgentInput,
	LoadAgentToolsInput,
} from '@hare/agent'

// ============================================
// TOOL EXPORTS (Most common)
// ============================================

// Core tool utilities
export { createTool, success, failure, ToolRegistry, createRegistry } from '@hare/tools'
export type { Tool, AnyTool, ToolContext, ToolResult, ToolDefinition, HareEnv } from '@hare/tools'

// Tool aggregation
export {
	getSystemTools,
	getToolsByCategory,
	getSystemToolsMap,
	isSystemTool,
	SYSTEM_TOOL_IDS,
	TOOL_COUNTS,
} from '@hare/tools'
export type { ToolCategory, SystemToolId } from '@hare/tools'

// Tool delegation
export { delegateTo, delegateToWithValidation } from '@hare/tools'

// ============================================
// TYPE EXPORTS (Most common)
// ============================================

// Tool configuration types
export { ToolConfigSchema, ToolTypeSchema } from '@hare/types'
export type { ToolConfig, ToolType } from '@hare/types'

// Agent configuration types
export { AgentStatusSchema, AgentConfigSchema, AgentSchema } from '@hare/types'
export type { AgentStatus, AgentConfig as AgentConfigType, Agent } from '@hare/types'

// API types
export { ApiErrorSchema, ApiSuccessSchema } from '@hare/types'
export type { ApiError, ApiSuccess } from '@hare/types'
