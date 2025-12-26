/**
 * API Hooks
 *
 * Re-export all hooks from a single entry point.
 */

export type { AIModel } from 'web-app/config'
// Re-export AI models from config for convenience
export { AI_MODELS, getModelById, getModelName } from 'web-app/config'
// Re-export analytics types
export type {
	AgentBreakdown,
	AnalyticsData,
	AnalyticsParams,
	AnalyticsSummary,
	ModelBreakdown,
	TimeSeriesData,
} from '../client'
// Re-export types
export type {
	Agent,
	AgentConfig,
	AgentStatus,
	AgentUsage,
	ApiError,
	ChatMessage,
	ChatRequest,
	ChatStreamEvent,
	CreateAgentInput,
	CreateToolInput,
	CreateWorkspaceInput,
	Tool,
	ToolType,
	UpdateAgentInput,
	UsageSummary,
	Workspace,
	WorkspaceRole,
} from '../types'
// WebSocket Agent hooks
export {
	type AgentMessage,
	type ConnectionStatus,
	type UseAgentWebSocketOptions,
	type UseAgentWebSocketReturn,
	useAgentWebSocket,
} from './use-agent-ws'
// Agent hooks
export {
	useAgent,
	useAgents,
	useCreateAgent,
	useDeleteAgent,
	useDeployAgent,
	useUpdateAgent,
} from './use-agents'
// Analytics hooks
export { useAnalytics } from './use-analytics'
// Chat hooks
export { useChat } from './use-chat'
// Tool hooks
export {
	TOOL_TYPES,
	useCreateTool,
	useDeleteTool,
	useTool,
	useTools,
	useUpdateTool,
} from './use-tools'
// Usage hooks
export { useAgentUsage, useUsage, useUsageByAgent } from './use-usage'

// Workspace hooks
export {
	useCreateWorkspace,
	useDeleteWorkspace,
	useUpdateWorkspace,
	useWorkspace,
	useWorkspaces,
} from './use-workspaces'

// Legacy export for backwards compatibility
export const AVAILABLE_MODELS = [
	{
		id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		name: 'Llama 3.3 70B',
		description: 'Most capable open model',
	},
	{ id: '@cf/meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', description: 'Fast and efficient' },
	{
		id: '@cf/mistral/mistral-7b-instruct-v0.2',
		name: 'Mistral 7B',
		description: 'Excellent reasoning',
	},
	{
		id: '@cf/qwen/qwen1.5-14b-chat-awq',
		name: 'Qwen 1.5 14B',
		description: 'Multilingual support',
	},
	{ id: '@cf/google/gemma-7b-it', name: 'Gemma 7B', description: 'Google open model' },
] as const
