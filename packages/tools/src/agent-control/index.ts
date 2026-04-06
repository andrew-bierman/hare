/**
 * Agent Control Tools for MCP
 *
 * These tools allow external AI clients to control Hare agents via MCP.
 * Provides capabilities like:
 * - Listing agents
 * - Starting/stopping agents
 * - Sending messages to agents
 * - Configuring agents
 * - Managing agent schedules
 */

import type { ToolContext } from '../types'
import {
	configureAgentTool,
	createAgentTool,
	deleteAgentTool,
	getAgentTool,
	listAgentsTool,
} from './crud'
import { deployAgentTool, rollbackAgentTool, undeployAgentTool } from './deployment'
import { sendMessageTool } from './messaging'
import { getAgentMetricsTool } from './metrics'
import { scheduleTaskTool } from './scheduling'
import { executeToolTool, listAgentToolsTool } from './tools'
import type { ExecutableTool } from './types'
import { createWebhookTool, deleteWebhookTool, listWebhooksTool } from './webhooks'

// Re-export all tools
export {
	configureAgentTool,
	createAgentTool,
	deleteAgentTool,
	getAgentTool,
	listAgentsTool,
} from './crud'
export { deployAgentTool, rollbackAgentTool, undeployAgentTool } from './deployment'
export { sendMessageTool } from './messaging'
export { getAgentMetricsTool } from './metrics'
export { scheduleTaskTool } from './scheduling'
export { executeToolTool, listAgentToolsTool } from './tools'
// Re-export types
export type { AgentControlContext, AgentControlEnv, ExecutableTool } from './types'
export { hasAgentControlCapabilities } from './types'
export { createWebhookTool, deleteWebhookTool, listWebhooksTool } from './webhooks'

/**
 * All agent control tools
 */
export const agentControlTools: ExecutableTool[] = [
	listAgentsTool,
	getAgentTool,
	sendMessageTool,
	configureAgentTool,
	createAgentTool,
	deleteAgentTool,
	deployAgentTool,
	undeployAgentTool,
	rollbackAgentTool,
	scheduleTaskTool,
	executeToolTool,
	listAgentToolsTool,
	getAgentMetricsTool,
	listWebhooksTool,
	createWebhookTool,
	deleteWebhookTool,
]

/**
 * Get agent control tools
 */
export function getAgentControlTools(_context: ToolContext): ExecutableTool[] {
	return agentControlTools
}

/**
 * Agent control tool IDs
 */
export const AGENT_CONTROL_TOOL_IDS = [
	'agent_list',
	'agent_get',
	'agent_send_message',
	'agent_configure',
	'agent_create',
	'agent_delete',
	'agent_deploy',
	'agent_undeploy',
	'agent_rollback',
	'agent_schedule',
	'agent_execute_tool',
	'agent_list_tools',
	'agent_metrics',
	'agent_webhook_list',
	'agent_webhook_create',
	'agent_webhook_delete',
] as const

export type AgentControlToolId = (typeof AGENT_CONTROL_TOOL_IDS)[number]
