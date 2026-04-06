/**
 * Agent Control Messaging Tools
 *
 * Tools for sending messages to agents.
 */

import { getErrorMessage } from '@hare/checks'
import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from '../types'
import { SendMessageOutputSchema } from './schemas'
import { hasAgentControlCapabilities } from './types'

/**
 * Send a message to an agent and get a response
 */
export const sendMessageTool = createTool({
	id: 'agent_send_message',
	description: 'Send a message to an agent and receive its response',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to send the message to'),
		message: z.string().min(1).describe('The message content'),
		stream: z.boolean().optional().default(false).describe('Stream the response'),
		metadata: z
			.record(z.string(), z.unknown())
			.optional()
			.describe('Additional metadata for the message'),
	}),
	outputSchema: SendMessageOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists and is deployed
			const agentResult = await db
				.prepare(
					`
					SELECT id, name, status
					FROM agents
					WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!agentResult) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			if (agentResult.status !== 'deployed') {
				return failure(`Agent is not deployed. Current status: ${agentResult.status}`)
			}

			// Check if Durable Object is available
			const hareAgent = context.env.HARE_AGENT
			if (!hareAgent) {
				return failure(
					'HareAgent Durable Object not available. Message routing requires HARE_AGENT binding.',
				)
			}

			// Route to the HareAgent Durable Object
			const id = hareAgent.idFromName(params.agentId)
			const stub = hareAgent.get(id)

			// Build the chat request
			const chatPayload = {
				message: params.message,
				userId: context.userId,
				metadata: params.metadata,
			}

			// Send to the agent's chat endpoint
			const response = await stub.fetch(
				new Request('http://internal/chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(chatPayload),
				}),
			)

			if (!response.ok) {
				const errorText = await response.text()
				return failure(`Agent chat failed: ${errorText}`)
			}

			// Collect the response (streaming is not supported via MCP tools)
			const text = await response.text()
			// Parse SSE format if present
			const lines = text.split('\n').filter((line) => line.startsWith('data: '))
			let content = ''
			let done = false

			for (const line of lines) {
				try {
					const data = JSON.parse(line.slice(6))
					if (data.type === 'text') {
						content += data.content
					} else if (data.type === 'done') {
						done = true
					}
				} catch {
					// Skip non-JSON lines
				}
			}

			// If no SSE format was found, use the raw text
			if (!content && text) {
				content = text
				done = true
			}

			return success({
				agentId: params.agentId,
				messageId: `msg-${Date.now()}`,
				userMessage: params.message,
				assistantResponse: content,
				timestamp: Date.now(),
				completed: done,
				note: params.stream
					? 'Streaming requested but not supported via MCP tools. Use WebSocket for streaming.'
					: undefined,
			})
		} catch (error) {
			return failure(getErrorMessage(error))
		}
	},
})
