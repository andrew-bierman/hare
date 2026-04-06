/**
 * Agent Control Tools for MCP
 *
 * Re-exports the real implementations from @hare/tools.
 * These tools allow external AI clients to control Hare agents via MCP.
 */

// Re-export everything from @hare/tools agent-control
export {
	AGENT_CONTROL_TOOL_IDS,
	type AgentControlToolId,
	agentControlTools,
	configureAgentTool,
	createAgentTool,
	deleteAgentTool,
	type ExecutableTool,
	executeToolTool,
	getAgentControlTools,
	getAgentMetricsTool,
	getAgentTool,
	listAgentsTool,
	listAgentToolsTool,
	scheduleTaskTool,
	sendMessageTool,
} from '@hare/tools'

import { getAgentControlTools, type ToolContext } from '@hare/tools'

/**
 * Get agent control tools with context for MCP registration
 * @deprecated Use getAgentControlTools from @hare/tools directly
 */
export function getAgentControlToolsForMcp(context: ToolContext) {
	return getAgentControlTools(context)
}
