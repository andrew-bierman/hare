/**
 * Agent Tools
 *
 * Tools for controlling and managing Hare agents via MCP.
 */

// Re-export types from @hare/tools for convenience
export { type AnyTool, type Tool, type ToolContext, type ToolResult } from '@hare/tools'

// Agent control tools
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
	type ExecutableTool,
} from './agent-control'
