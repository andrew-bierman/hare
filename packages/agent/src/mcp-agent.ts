/**
 * HareMcpAgent - Model Context Protocol Agent
 *
 * Implements the MCP specification for remote tool servers.
 * Allows external AI clients to connect and use Hare tools.
 *
 * NOTE: This file can only be imported in Cloudflare Workers context
 * because it uses the 'agents/mcp' package which depends on 'cloudflare:workers'.
 */

import { getSystemTools, type HareEnv, type ToolContext, ToolRegistry } from '@hare/tools'
import { DEFAULT_MCP_AGENT_STATE, type McpAgentState } from '@hare/types'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { toJSONSchema } from 'zod/v4'

// Re-export types for convenience
export type { McpAgentState }

/**
 * Environment interface for HareMcpAgent.
 * Extends HareEnv but requires AI binding.
 */
export interface McpAgentEnv extends HareEnv {
	AI: Ai
}

/**
 * HareMcpAgent - Exposes Hare tools via Model Context Protocol.
 *
 * MCP allows external AI clients (Claude, Cursor, etc.) to use
 * Hare's tools in a standardized way.
 *
 * @example
 * ```ts
 * import { HareMcpAgent } from '@hare/agent/workers'
 *
 * export { HareMcpAgent }
 *
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const id = env.MCP_AGENT.idFromName('default')
 *     return env.MCP_AGENT.get(id).fetch(request)
 *   }
 * }
 * ```
 */
export class HareMcpAgent<TEnv extends McpAgentEnv = McpAgentEnv> extends McpAgent<
	TEnv,
	McpAgentState,
	Record<string, unknown>
> {
	/** Server configuration required by McpAgent */
	server = new McpServer({
		name: 'hare-mcp',
		version: '1.0.0',
	})

	/** Available tools */
	private toolRegistry: ToolRegistry = new ToolRegistry()

	/**
	 * Initial state.
	 */
	override initialState: McpAgentState = DEFAULT_MCP_AGENT_STATE

	/**
	 * Called when the agent starts - load tools.
	 */
	async onStart(): Promise<void> {
		// Load system tools only if enabled
		this.reloadTools()
	}

	/**
	 * Reload tools based on current state.
	 * Called on startup and when systemToolsEnabled changes.
	 */
	private reloadTools(): void {
		// Clear existing tools
		this.toolRegistry = new ToolRegistry()

		// Load system tools only if enabled
		if (this.state.systemToolsEnabled) {
			const context = this.createToolContext()
			const systemTools = getSystemTools(context)
			this.toolRegistry.registerAll(systemTools)
		}
	}

	/**
	 * Initialize MCP tools - called by the MCP server.
	 * This is where we register tools and resources with the MCP protocol.
	 */
	async init(): Promise<void> {
		// Register tools with MCP
		for (const tool of this.toolRegistry.list()) {
			// Convert Zod schema to JSON Schema for MCP using Zod v4's built-in conversion
			const inputSchema = toJSONSchema(tool.inputSchema)

			// Register tool with MCP - create fresh context for each execution
			const toolId = tool.id
			this.server.tool(toolId, tool.description, inputSchema, async (params: unknown) => {
				// Create fresh context with current workspaceId for each tool execution
				const executionContext = this.createToolContext()
				const result = await this.toolRegistry.execute({
					id: toolId,
					params,
					context: executionContext,
				})

				if (result.success) {
					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify(result.data, null, 2),
							},
						],
					}
				}
				return {
					content: [
						{
							type: 'text' as const,
							text: `Error: ${result.error}`,
						},
					],
					isError: true,
				}
			})
		}

		// Register workspace resource
		this.server.resource('workspace', 'Current workspace information', async () => {
			return {
				contents: [
					{
						uri: `hare://workspace/${this.state.workspaceId}`,
						mimeType: 'application/json',
						text: JSON.stringify({
							workspaceId: this.state.workspaceId,
							connectedClients: this.state.connectedClients,
							lastActivity: this.state.lastActivity,
						}),
					},
				],
			}
		})
	}

	/**
	 * Called when state is updated.
	 * Override this method to add custom state change handling.
	 */
	onStateUpdate(_state: McpAgentState): void {
		// State update hook - override in subclass if needed
	}

	/**
	 * Configure the MCP agent.
	 */
	async configure(options: { workspaceId?: string; systemToolsEnabled?: boolean }): Promise<void> {
		const systemToolsChanged =
			options.systemToolsEnabled !== undefined &&
			options.systemToolsEnabled !== this.state.systemToolsEnabled

		this.setState({
			...this.state,
			...(options.workspaceId !== undefined && { workspaceId: options.workspaceId }),
			...(options.systemToolsEnabled !== undefined && {
				systemToolsEnabled: options.systemToolsEnabled,
			}),
			lastActivity: Date.now(),
		})

		// Reload tools if systemToolsEnabled changed
		if (systemToolsChanged) {
			this.reloadTools()
		}
	}

	/**
	 * Create tool execution context with current state.
	 * Called on-demand for each tool execution to ensure fresh context.
	 */
	private createToolContext(): ToolContext {
		return {
			env: this.env,
			workspaceId: this.state.workspaceId || 'default',
			userId: 'mcp-client',
			agentId: this.state.agentId,
		}
	}
}

export default HareMcpAgent
