/**
 * HareMcpAgent - Model Context Protocol Agent
 *
 * Implements the MCP specification for remote tool servers.
 * Allows external AI clients to connect and use Hare tools.
 *
 * NOTE: This file can only be imported in Cloudflare Workers context
 * because it uses the 'agents/mcp' package which depends on 'cloudflare:workers'.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { type HareEnv, type ToolContext, getSystemTools, ToolRegistry } from '@hare/tools'
import { DEFAULT_MCP_AGENT_STATE, type McpAgentState } from '@hare/types'

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
		// Load system tools with a default context for initialization
		const initContext = this.createToolContext()
		const systemTools = getSystemTools(initContext)
		this.toolRegistry.registerAll(systemTools)
	}

	/**
	 * Initialize MCP tools - called by the MCP server.
	 * This is where we register tools and resources with the MCP protocol.
	 */
	async init(): Promise<void> {
		// Register tools with MCP
		for (const tool of this.toolRegistry.list()) {
			// Convert Zod schema to JSON Schema for MCP
			// Cast to any because zod-to-json-schema types are built for Zod v3
			// but the actual runtime behavior works fine with Zod v4
			// biome-ignore lint/suspicious/noExplicitAny: zod-to-json-schema types built for Zod v3
			const inputSchema = zodToJsonSchema(tool.inputSchema as any, {
				$refStrategy: 'none',
			})

			// Register tool with MCP - create fresh context for each execution
			const toolId = tool.id
			this.server.tool(toolId, tool.description, inputSchema, async (params: unknown) => {
				// Create fresh context with current workspaceId for each tool execution
				const executionContext = this.createToolContext()
				const result = await this.toolRegistry.execute({ id: toolId, params, context: executionContext })

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
	 */
	onStateUpdate(state: McpAgentState): void {
		console.log('MCP Agent state updated:', state)
	}

	/**
	 * Configure the MCP agent.
	 */
	async configure(workspaceId: string): Promise<void> {
		this.setState({
			...this.state,
			workspaceId,
			lastActivity: Date.now(),
		})
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
		}
	}
}

export default HareMcpAgent
