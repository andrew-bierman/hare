import { z } from '@hono/zod-openapi'
import { MetadataSchema } from './common'

/**
 * Message role enum.
 */
export const MessageRoleSchema = z
	.enum(['user', 'assistant', 'system'])
	.openapi({ example: 'user' })

/**
 * Schema for chat request body.
 */
export const ChatRequestSchema = z
	.object({
		message: z.string().min(1).openapi({ example: 'Hello, how are you?' }),
		sessionId: z.string().optional().openapi({ example: 'session_abc123' }),
		metadata: MetadataSchema.optional().openapi({ example: { userId: 'user_123' } }),
	})
	.openapi('ChatRequest')

/**
 * Message schema for API responses.
 */
export const MessageSchema = z
	.object({
		id: z.string().openapi({ example: 'msg_abc123' }),
		conversationId: z.string().openapi({ example: 'conv_xyz789' }),
		role: MessageRoleSchema,
		content: z.string().openapi({ example: 'Hello! How can I help you?' }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Message')

/**
 * Conversation schema for API responses.
 */
export const ConversationSchema = z
	.object({
		id: z.string().openapi({ example: 'conv_xyz789' }),
		agentId: z.string().openapi({ example: 'agent_abc123' }),
		userId: z.string().openapi({ example: 'user_abc123' }),
		title: z.string().openapi({ example: 'Chat about features' }),
		messageCount: z.number().openapi({ example: 5 }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Conversation')
