/**
 * @hare/agent - AI agents for Cloudflare Workers
 *
 * This is the main entry point that can be safely imported in any environment.
 * For Workers-only exports (HareAgent, HareMcpAgent), use '@hare/agent/workers'.
 *
 * @example
 * ```ts
 * // Universal imports (safe anywhere)
 * import { EdgeAgent, createEdgeAgent } from '@hare/agent'
 *
 * // Workers-only imports
 * import { HareAgent, HareMcpAgent } from '@hare/agent/workers'
 * ```
 */

// Types (safe to import anywhere) - re-exported from @hare/types
export type {
	HareAgentState,
	McpAgentState,
	ClientMessage,
	ServerMessage,
	ChatPayload,
	ToolExecutePayload,
	SchedulePayload,
	ScheduledTask,
} from '@hare/types'

export { DEFAULT_HARE_AGENT_STATE, DEFAULT_MCP_AGENT_STATE } from '@hare/types'

// Edge Agent (universal - no cloudflare:workers dependency)
export { EdgeAgent, createEdgeAgent } from './edge-agent'
export type { AgentTool, AgentOptions, AgentStreamResponse } from './edge-agent'

// Router utilities (universal)
export {
	routeToHareAgent,
	routeToMcpAgent,
	routeWebSocketToAgent,
	routeHttpToAgent,
	isWebSocketRequest,
	getAgentIdFromRequest,
	createAgentHeaders,
} from './router'
export type {
	HareAgentEnv,
	AgentRouteConfig,
	RouteToHareAgentInput,
	RouteToMcpAgentInput,
	RouteWebSocketToAgentInput,
	RouteHttpToAgentInput,
} from './router'

// Workers AI Provider (universal)
export {
	createWorkersAIModel,
	getWorkersAIModelId,
	getAvailableModels,
	generateEmbedding,
	generateEmbeddings,
	WORKERS_AI_MODELS,
	EMBEDDING_MODELS,
} from './providers/workers-ai'
export type {
	WorkersAIModelId,
	EmbeddingModelId,
	CreateWorkersAIModelInput,
	GenerateEmbeddingInput,
	GenerateEmbeddingsInput,
} from './providers/workers-ai'

// Memory store (universal)
export {
	createMemoryStore,
	toAgentMessages,
	D1MemoryStore,
} from './memory'
export type {
	MessageRole,
	ConversationMessage,
	SaveMessageInput,
	GetMessagesInput,
	GetOrCreateConversationInput,
	SearchMessagesInput,
	MemoryStore,
} from './memory'

// Agent control tools (for MCP)
export {
	agentControlTools,
	configureAgentTool,
	createAgentTool,
	deleteAgentTool,
	executeToolTool,
	getAgentControlToolsForMcp,
	getAgentMetricsTool,
	getAgentTool,
	listAgentsTool,
	listAgentToolsTool,
	scheduleTaskTool,
	sendMessageTool,
} from './tools'
export type { AnyTool, ExecutableTool, Tool, ToolContext, ToolResult } from './tools'

// Agent factory (for creating agents from database configurations)
export {
	createAgentFromConfig,
	createSimpleAgent,
	loadAgentTools,
} from './factory'
export type {
	AgentConfig,
	CreateAgentFromConfigInput,
	CreateSimpleAgentInput,
	LoadAgentToolsInput,
} from './factory'
