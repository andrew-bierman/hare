/**
 * Agent Types
 *
 * Type definitions for Cloudflare Agents that can be safely imported
 * in any environment (Next.js, Workers, etc.)
 *
 * The actual agent implementations (HareAgent, HareMcpAgent) use
 * cloudflare:workers and can only be imported in Workers context.
 */

import type { CoreMessage } from 'ai'

/**
 * Agent state that is persisted and synced with clients.
 */
export interface HareAgentState {
	/** Agent configuration ID from database */
	agentId: string
	/** Workspace ID */
	workspaceId: string
	/** Agent name */
	name: string
	/** Agent instructions/system prompt */
	instructions: string
	/** Model to use */
	model: string
	/** Conversation history */
	messages: CoreMessage[]
	/** Whether the agent is currently processing */
	isProcessing: boolean
	/** Last activity timestamp */
	lastActivity: number
	/** Connected user IDs */
	connectedUsers: string[]
	/** Scheduled tasks */
	scheduledTasks: ScheduledTask[]
	/** Agent status */
	status: 'idle' | 'processing' | 'error'
	/** Last error if any */
	lastError?: string
}

/**
 * Scheduled task definition.
 */
export interface ScheduledTask {
	id: string
	type: 'one-time' | 'recurring'
	executeAt?: number
	cron?: string
	action: string
	payload?: Record<string, unknown>
}

/**
 * Message sent from client to agent.
 */
export interface ClientMessage {
	type: 'chat' | 'configure' | 'execute_tool' | 'get_state' | 'schedule'
	payload: unknown
}

/**
 * Chat message payload.
 */
export interface ChatPayload {
	message: string
	userId: string
	sessionId?: string
	metadata?: Record<string, unknown>
}

/**
 * Tool execution payload.
 */
export interface ToolExecutePayload {
	toolId: string
	params: Record<string, unknown>
}

/**
 * Schedule payload.
 */
export interface SchedulePayload {
	action: string
	executeAt?: number
	cron?: string
	payload?: Record<string, unknown>
}

/**
 * Server message sent to clients.
 */
export interface ServerMessage {
	type: 'text' | 'tool_call' | 'tool_result' | 'state_update' | 'error' | 'done'
	data: unknown
	timestamp: number
}

/**
 * MCP Agent state.
 */
export interface McpAgentState {
	workspaceId: string
	connectedClients: number
	lastActivity: number
}

/**
 * Default initial state for HareAgent.
 */
export const DEFAULT_HARE_AGENT_STATE: HareAgentState = {
	agentId: '',
	workspaceId: '',
	name: 'Hare Agent',
	instructions: 'You are a helpful AI assistant.',
	model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	messages: [],
	isProcessing: false,
	lastActivity: Date.now(),
	connectedUsers: [],
	scheduledTasks: [],
	status: 'idle',
}

/**
 * Default initial state for MCP Agent.
 */
export const DEFAULT_MCP_AGENT_STATE: McpAgentState = {
	workspaceId: '',
	connectedClients: 0,
	lastActivity: Date.now(),
}
