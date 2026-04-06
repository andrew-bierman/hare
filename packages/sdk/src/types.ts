/**
 * hareai/types - Complete type exports
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
 * } from 'hareai/types'
 * ```
 *
 * @packageDocumentation
 */

// Also export agent-specific types
export type {
	ChatPayload,
	ClientMessage,
	HareAgentState,
	McpAgentState,
	ScheduledTask,
	SchedulePayload,
	ServerMessage,
	ToolExecutePayload,
} from '@hare/agent'
// Tool types from @hare/tools
export type {
	AnyTool,
	ExecutableTool,
	HareEnv,
	SystemToolId,
	Tool,
	ToolCategory,
	ToolContext,
	ToolDefinition,
	ToolResult,
} from '@hare/tools'
// Re-export everything from @hare/types
export * from '@hare/types'
