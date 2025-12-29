/**
 * Edge-compatible AI Agent implementation.
 *
 * This is a lightweight agent that works with Workers AI and the Vercel AI SDK.
 * Designed to run on Cloudflare Workers without Node.js dependencies.
 */

import { type ModelMessage, streamText } from 'ai'
import { createWorkersAIModel } from './providers/workers-ai'

/**
 * Tool definition for the agent.
 */
export interface AgentTool {
	id: string
	description: string
	inputSchema: Record<string, unknown>
	execute: (params: Record<string, unknown>) => Promise<unknown>
}

/**
 * Agent configuration.
 */
export interface AgentOptions {
	name: string
	instructions: string
	model: string
	ai: Ai
	tools?: AgentTool[]
}

/**
 * Streaming response from the agent.
 */
export interface AgentStreamResponse {
	textStream: AsyncIterable<string>
	text: Promise<string>
}

/**
 * Edge-compatible AI Agent.
 */
export class EdgeAgent {
	readonly name: string
	readonly instructions: string
	readonly model: ReturnType<typeof createWorkersAIModel>
	readonly tools: Map<string, AgentTool>

	constructor(options: AgentOptions) {
		this.name = options.name
		this.instructions = options.instructions
		this.model = createWorkersAIModel({ modelName: options.model, ai: options.ai })
		this.tools = new Map()

		if (options.tools) {
			for (const tool of options.tools) {
				this.tools.set(tool.id, tool)
			}
		}
	}

	/**
	 * Stream a response from the agent.
	 */
	async stream(messages: ModelMessage[]): Promise<AgentStreamResponse> {
		// Build system message
		const systemMessage: ModelMessage = {
			role: 'system',
			content: this.buildSystemPrompt(),
		}

		// Prepare messages with system prompt
		const allMessages: ModelMessage[] = [systemMessage, ...messages]

		// Use AI SDK's streamText for streaming
		const result = streamText({
			model: this.model,
			messages: allMessages,
		})

		// Create async iterator for text stream
		const textStream = this.createTextStream(result)

		// Create promise for full text
		const textPromise = this.collectText(result)

		return {
			textStream,
			text: textPromise,
		}
	}

	/**
	 * Generate a non-streaming response.
	 */
	async generate(messages: ModelMessage[]): Promise<string> {
		const response = await this.stream(messages)
		return response.text
	}

	/**
	 * Build the system prompt including tool documentation.
	 */
	private buildSystemPrompt(): string {
		const parts: string[] = [this.instructions]

		if (this.tools.size > 0) {
			parts.push('\n\n## Available Tools\n')
			parts.push('You have access to the following tools:\n')

			for (const [id, tool] of this.tools) {
				parts.push(`- **${id}**: ${tool.description}`)
			}

			parts.push('\nTo use a tool, describe what you want to do and the system will execute it.')
		}

		return parts.join('\n')
	}

	/**
	 * Create an async iterable from the stream result.
	 */
	private async *createTextStream(result: ReturnType<typeof streamText>): AsyncIterable<string> {
		const stream = (await result).textStream
		for await (const chunk of stream) {
			yield chunk
		}
	}

	/**
	 * Collect all text from the stream.
	 */
	private async collectText(result: ReturnType<typeof streamText>): Promise<string> {
		return (await result).text
	}
}

/**
 * Create a new Edge-compatible agent.
 */
export function createEdgeAgent(options: AgentOptions): EdgeAgent {
	return new EdgeAgent(options)
}
