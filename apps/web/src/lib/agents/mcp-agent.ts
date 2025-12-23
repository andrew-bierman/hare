/**
 * HareMcpAgent - Model Context Protocol Agent
 *
 * Implements the MCP specification for remote tool servers.
 * Allows external AI clients to connect and use Hare tools.
 */

import { McpAgent } from 'agents/mcp'
import { z } from 'zod'
import { getSystemTools, type Tool, type ToolContext } from './tools'

/**
 * MCP Agent state.
 */
export interface McpAgentState {
	workspaceId: string
	connectedClients: number
	lastActivity: number
}

/**
 * Default MCP agent state.
 */
const DEFAULT_STATE: McpAgentState = {
	workspaceId: '',
	connectedClients: 0,
	lastActivity: Date.now(),
}

/**
 * HareMcpAgent - Exposes Hare tools via Model Context Protocol.
 *
 * MCP allows external AI clients (Claude, Cursor, etc.) to use
 * Hare's tools in a standardized way.
 */
export class HareMcpAgent extends McpAgent<CloudflareEnv, McpAgentState, Record<string, unknown>> {
	/** Server name */
	server = {
		name: 'hare-mcp',
		version: '1.0.0',
	}

	/** Available tools */
	private hareTools: Map<string, Tool> = new Map()

	/**
	 * Initial state.
	 */
	override initialState: McpAgentState = DEFAULT_STATE

	/**
	 * Initialize MCP agent and register tools.
	 */
	async init(): Promise<void> {
		// Load system tools
		const context = this.createToolContext()
		const systemTools = getSystemTools(context)

		for (const tool of systemTools) {
			this.hareTools.set(tool.id, tool)

			// Convert Zod schema to JSON Schema for MCP
			const inputSchema = this.zodToJsonSchema(tool.inputSchema)

			// Register tool with MCP
			this.server.tool(tool.id, tool.description, inputSchema, async (params: unknown) => {
				const result = await tool.execute(params as Record<string, unknown>, context)

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

		// Register some MCP-specific resources
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

		// Register prompts
		this.server.prompt(
			'analyze-data',
			'Analyze data using Hare tools',
			[
				{
					name: 'data',
					description: 'The data to analyze',
					required: true,
				},
			],
			async (args: { data: string }) => {
				return {
					messages: [
						{
							role: 'user' as const,
							content: {
								type: 'text' as const,
								text: `Please analyze the following data using the available tools:\n\n${args.data}`,
							},
						},
					],
				}
			},
		)
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
	 * Create tool execution context.
	 */
	private createToolContext(): ToolContext {
		return {
			env: this.env,
			workspaceId: this.state.workspaceId || 'default',
			userId: 'mcp-client',
		}
	}

	/**
	 * Convert Zod schema to JSON Schema for MCP.
	 */
	private zodToJsonSchema(schema: z.ZodSchema): Record<string, unknown> {
		// Basic conversion - for complex schemas, consider using zod-to-json-schema
		try {
			const shape = (schema as z.ZodObject<z.ZodRawShape>).shape
			if (!shape) {
				return { type: 'object', properties: {} }
			}

			const properties: Record<string, unknown> = {}
			const required: string[] = []

			for (const [key, value] of Object.entries(shape)) {
				const zodType = value as z.ZodTypeAny
				properties[key] = this.zodTypeToJsonSchema(zodType)

				// Check if required (not optional)
				if (!zodType.isOptional()) {
					required.push(key)
				}
			}

			return {
				type: 'object',
				properties,
				required: required.length > 0 ? required : undefined,
			}
		} catch {
			return { type: 'object', properties: {} }
		}
	}

	/**
	 * Convert a single Zod type to JSON Schema.
	 */
	private zodTypeToJsonSchema(zodType: z.ZodTypeAny): Record<string, unknown> {
		const typeName = zodType._def.typeName

		switch (typeName) {
			case 'ZodString':
				return { type: 'string' }
			case 'ZodNumber':
				return { type: 'number' }
			case 'ZodBoolean':
				return { type: 'boolean' }
			case 'ZodArray':
				return {
					type: 'array',
					items: this.zodTypeToJsonSchema(zodType._def.type),
				}
			case 'ZodObject':
				return this.zodToJsonSchema(zodType)
			case 'ZodOptional':
				return this.zodTypeToJsonSchema(zodType._def.innerType)
			case 'ZodEnum':
				return {
					type: 'string',
					enum: zodType._def.values,
				}
			default:
				return { type: 'string' }
		}
	}
}

export default HareMcpAgent
