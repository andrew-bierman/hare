/**
 * Agent Tools
 *
 * Tools for controlling and managing Hare agents via MCP.
 */

// Re-export types from @hare/tools for convenience
export { type AnyTool, type Tool, type ToolContext, type ToolResult } from '@hare/tools'

// Agent control tools (re-exported from @hare/tools)
export {
	AGENT_CONTROL_TOOL_IDS,
	type AgentControlToolId,
	agentControlTools,
	configureAgentTool,
	createAgentTool,
	deleteAgentTool,
	executeToolTool,
	type ExecutableTool,
	getAgentControlTools,
	getAgentControlToolsForMcp,
	getAgentMetricsTool,
	getAgentTool,
	listAgentsTool,
	listAgentToolsTool,
	scheduleTaskTool,
	sendMessageTool,
} from './agent-control'
