/**
 * API Hooks
 *
 * Re-export all hooks from a single entry point.
 */

// Agent hooks
export {
	useAgents,
	useAgent,
	useCreateAgent,
	useUpdateAgent,
	useDeleteAgent,
	useDeployAgent,
} from './use-agents'

// Tool hooks
export {
	useTools,
	useTool,
	useCreateTool,
	useUpdateTool,
	useDeleteTool,
	TOOL_TYPES,
} from './use-tools'

// Workspace hooks
export {
	useWorkspaces,
	useWorkspace,
	useCreateWorkspace,
	useUpdateWorkspace,
	useDeleteWorkspace,
} from './use-workspaces'

// Usage hooks
export { useUsage, useUsageByAgent, useAgentUsage } from './use-usage'

// Analytics hooks
export { useAnalytics } from './use-analytics'

// Chat hooks
export { useChat } from './use-chat'

// Re-export types
export type {
	Agent,
	AgentConfig,
	AgentStatus,
	CreateAgentInput,
	UpdateAgentInput,
	Tool,
	ToolType,
	CreateToolInput,
	Workspace,
	WorkspaceRole,
	CreateWorkspaceInput,
	UsageSummary,
	AgentUsage,
	ChatMessage,
	ChatRequest,
	ChatStreamEvent,
	ApiError,
} from '../types'

// Re-export analytics types
export type {
	AnalyticsParams,
	AnalyticsData,
	TimeSeriesData,
	AgentBreakdown,
	ModelBreakdown,
	AnalyticsSummary,
} from '../client'

// Re-export AI models from config for convenience
export { AI_MODELS, getModelById, getModelName } from 'web-app/config'
export type { AIModel } from 'web-app/config'

// Legacy export for backwards compatibility
export const AVAILABLE_MODELS = [
	{ id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', name: 'Llama 3.3 70B', description: 'Most capable open model' },
	{ id: '@cf/meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', description: 'Fast and efficient' },
	{ id: '@cf/mistral/mistral-7b-instruct-v0.2', name: 'Mistral 7B', description: 'Excellent reasoning' },
	{ id: '@cf/qwen/qwen1.5-14b-chat-awq', name: 'Qwen 1.5 14B', description: 'Multilingual support' },
	{ id: '@cf/google/gemma-7b-it', name: 'Gemma 7B', description: 'Google open model' },
] as const
