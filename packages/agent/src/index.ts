/**
 * @hare/agent - AI agents for Cloudflare Workers
 *
 * This is the main entry point that can be safely imported in any environment.
 * For Workers-only exports (HareAgent, HareMcpAgent), use '@hare/agent/workers'.
 *
 * @example
 * ```ts
 * // Universal imports (safe anywhere)
 * import { HareEdgeAgent, createHareEdgeAgent } from '@hare/agent'
 *
 * // Workers-only imports
 * import { HareAgent, HareMcpAgent } from '@hare/agent/workers'
 * ```
 */

// Types (safe to import anywhere) - re-exported from @hare/types
export type {
	ChatPayload,
	ClientMessage,
	HareAgentState,
	McpAgentState,
	ScheduledTask,
	SchedulePayload,
	ServerMessage,
	ToolExecutePayload,
} from '@hare/types'

export { DEFAULT_HARE_AGENT_STATE, DEFAULT_MCP_AGENT_STATE } from '@hare/types'
export type { AgentOptions, AgentStreamResponse, AgentTool } from './edge-agent'
// Edge Agent (universal - no cloudflare:workers dependency)
export { createEdgeAgent, createHareEdgeAgent, EdgeAgent, HareEdgeAgent } from './edge-agent'
export type {
	AgentConfig,
	CreateAgentFromConfigInput,
	CreateSimpleAgentInput,
	LoadAgentToolsInput,
} from './factory'
// Agent factory (for creating agents from database configurations)
export {
	createAgentFromConfig,
	createSimpleAgent,
	loadAgentTools,
} from './factory'
export type {
	ConversationMessage,
	GetMessagesInput,
	GetOrCreateConversationInput,
	MemoryStore,
	MessageRole,
	SaveMessageInput,
	SearchMessagesInput,
} from './memory'
// Memory store (universal)
export {
	createMemoryStore,
	D1MemoryStore,
	toAgentMessages,
} from './memory'
export type {
	CreateWorkersAIModelInput,
	EmbeddingModelId,
	GenerateEmbeddingInput,
	GenerateEmbeddingsInput,
	WorkersAIModelId,
} from './providers/workers-ai'
// Workers AI Provider (universal)
export {
	createWorkersAIModel,
	EMBEDDING_MODELS,
	generateEmbedding,
	generateEmbeddings,
	getAvailableModels,
	getWorkersAIModelId,
	WORKERS_AI_MODELS,
} from './providers/workers-ai'
export type {
	AgentRouteConfig,
	HareAgentEnv,
	RouteHttpToAgentInput,
	RouteToHareAgentInput,
	RouteToMcpAgentInput,
	RouteWebSocketToAgentInput,
} from './router'
// Router utilities (universal)
export {
	createAgentHeaders,
	getAgentIdFromRequest,
	isWebSocketRequest,
	routeHttpToAgent,
	routeToHareAgent,
	routeToMcpAgent,
	routeWebSocketToAgent,
} from './router'
export type { AnyTool, ExecutableTool, Tool, ToolContext, ToolResult } from './tools'
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
