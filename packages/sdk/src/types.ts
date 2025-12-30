/**
 * hare/types - Complete type exports
 *
 * This module provides access to all type definitions used in the Hare platform.
 *
 * @example
 * ```ts
 * import type {
 *   HareAgentState,
 *   ToolContext,
 *   AgentConfig,
 *   ChatMessage,
 * } from 'hare/types'
 * ```
 *
 * @packageDocumentation
 */

// Re-export everything from @hare/types
export * from '@hare/types'

// Also export agent-specific types
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

// Tool types from @hare/tools
export type {
	Tool,
	AnyTool,
	ToolContext,
	ToolResult,
	ToolDefinition,
	HareEnv,
	ToolCategory,
	SystemToolId,
	ExecutableTool,
} from '@hare/tools'
