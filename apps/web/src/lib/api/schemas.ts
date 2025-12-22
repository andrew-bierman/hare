import { z } from '@hono/zod-openapi'

/**
 * JSON value schema - represents any valid JSON value.
 * Uses z.unknown() for type safety, requiring type narrowing at runtime.
 */
const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
	z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonValueSchema), z.record(z.string(), JsonValueSchema)])
)

/**
 * JSON Schema property definition.
 * Represents a single property in a JSON Schema.
 */
export const JsonSchemaPropertySchema = z
	.object({
		type: z.string().optional(),
		description: z.string().optional(),
		enum: z.array(z.string()).optional(),
		default: JsonValueSchema.optional(),
		required: z.boolean().optional(),
	})
	.passthrough() // Allow additional JSON Schema properties

/**
 * JSON Schema object.
 * Represents the inputSchema for tools, allowing arbitrary JSON Schema properties.
 */
export const JsonSchemaSchema = z.record(z.string(), JsonSchemaPropertySchema)

/**
 * Tool configuration schema.
 * Configuration can be any JSON object with string keys.
 */
export const ToolConfigSchema = z.record(z.string(), JsonValueSchema)

/**
 * Metadata schema for chat messages.
 * Allows any JSON object with string keys.
 */
export const MetadataSchema = z.record(z.string(), JsonValueSchema)

// Common schemas
export const IdParamSchema = z.object({
	id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: 'agent_abc123' }),
})

export const ErrorSchema = z
	.object({
		error: z.string().openapi({ example: 'Resource not found' }),
		code: z.string().optional().openapi({ example: 'NOT_FOUND' }),
	})
	.openapi('Error')

export const SuccessSchema = z
	.object({
		success: z.boolean().openapi({ example: true }),
	})
	.openapi('Success')

// Agent schemas
export const AgentConfigSchema = z
	.object({
		temperature: z.number().min(0).max(2).optional().openapi({ example: 0.7 }),
		maxTokens: z.number().min(1).max(100000).optional().openapi({ example: 4096 }),
		topP: z.number().min(0).max(1).optional().openapi({ example: 0.9 }),
		topK: z.number().min(0).optional().openapi({ example: 40 }),
		stopSequences: z
			.array(z.string())
			.optional()
			.openapi({ example: ['END'] }),
	})
	.openapi('AgentConfig')

export const AgentStatusSchema = z
	.enum(['draft', 'deployed', 'archived'])
	.openapi({ example: 'draft' })

export const AgentSchema = z
	.object({
		id: z.string().openapi({ example: 'agent_abc123' }),
		workspaceId: z.string().openapi({ example: 'ws_xyz789' }),
		name: z.string().openapi({ example: 'Customer Support Agent' }),
		description: z.string().nullable().openapi({ example: 'Handles customer inquiries' }),
		model: z.string().openapi({ example: 'llama-3.3-70b-instruct' }),
		instructions: z.string().openapi({ example: 'You are a helpful customer support agent.' }),
		config: AgentConfigSchema.optional(),
		status: AgentStatusSchema,
		toolIds: z
			.array(z.string())
			.optional()
			.openapi({ example: ['tool_http', 'tool_sql'] }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Agent')

export const CreateAgentSchema = z
	.object({
		name: z.string().min(1).max(100).openapi({ example: 'My Agent' }),
		description: z.string().optional().openapi({ example: 'A helpful assistant' }),
		model: z.string().openapi({ example: 'llama-3.3-70b-instruct' }),
		instructions: z.string().min(1).openapi({ example: 'You are a helpful assistant.' }),
		config: AgentConfigSchema.optional(),
		toolIds: z
			.array(z.string())
			.optional()
			.openapi({ example: ['tool_http'] }),
	})
	.openapi('CreateAgent')

export const UpdateAgentSchema = CreateAgentSchema.partial()
	.extend({
		status: AgentStatusSchema.optional(),
	})
	.openapi('UpdateAgent')

export const DeployAgentSchema = z
	.object({
		version: z.string().optional().openapi({ example: '1.0.0' }),
	})
	.openapi('DeployAgent')

export const DeploymentSchema = z
	.object({
		id: z.string().openapi({ example: 'agent_abc123' }),
		status: AgentStatusSchema,
		deployedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		version: z.string().openapi({ example: '1.0.0' }),
	})
	.openapi('Deployment')

// Workspace schemas
export const WorkspaceRoleSchema = z
	.enum(['owner', 'admin', 'member', 'viewer'])
	.openapi({ example: 'owner' })

export const WorkspaceSchema = z
	.object({
		id: z.string().openapi({ example: 'ws_xyz789' }),
		name: z.string().openapi({ example: 'My Workspace' }),
		description: z.string().nullable().openapi({ example: 'Default workspace' }),
		role: WorkspaceRoleSchema,
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Workspace')

export const CreateWorkspaceSchema = z
	.object({
		name: z.string().min(1).max(100).openapi({ example: 'My Workspace' }),
		description: z.string().optional().openapi({ example: 'A workspace for my agents' }),
	})
	.openapi('CreateWorkspace')

export const UpdateWorkspaceSchema = z
	.object({
		name: z.string().min(1).max(100).optional().openapi({ example: 'Updated Workspace' }),
		description: z.string().optional().openapi({ example: 'Updated description' }),
	})
	.openapi('UpdateWorkspace')

// Tool schemas
export const ToolTypeSchema = z
	.enum(['http', 'sql', 'kv', 'r2', 'vectorize', 'custom'])
	.openapi({ example: 'http' })

export const ToolSchema = z
	.object({
		id: z.string().openapi({ example: 'tool_http' }),
		name: z.string().openapi({ example: 'HTTP Request' }),
		description: z.string().openapi({ example: 'Make HTTP requests to external APIs' }),
		type: ToolTypeSchema,
		inputSchema: JsonSchemaSchema.openapi({
			example: {
				url: { type: 'string', description: 'The URL to request' },
				method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
			},
		}),
		config: ToolConfigSchema.optional().openapi({ example: {} }),
		code: z
			.string()
			.optional()
			.openapi({ example: 'export default async function(input) { return fetch(input.url) }' }),
		isSystem: z.boolean().openapi({ example: true }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Tool')

export const CreateToolSchema = z
	.object({
		name: z.string().min(1).max(100).openapi({ example: 'My Custom Tool' }),
		description: z.string().min(1).openapi({ example: 'A custom tool for my agent' }),
		type: ToolTypeSchema,
		inputSchema: JsonSchemaSchema.openapi({ example: { input: { type: 'string' } } }),
		config: ToolConfigSchema.optional().openapi({ example: {} }),
		code: z
			.string()
			.optional()
			.openapi({ example: 'export default async function(input) { return input }' }),
	})
	.openapi('CreateTool')

export const UpdateToolSchema = CreateToolSchema.partial().openapi('UpdateTool')

// Auth schemas
export const UserSchema = z
	.object({
		id: z.string().openapi({ example: 'user_abc123' }),
		email: z.string().email().openapi({ example: 'user@example.com' }),
		name: z.string().openapi({ example: 'John Doe' }),
	})
	.openapi('User')

export const SignUpSchema = z
	.object({
		email: z.string().email().openapi({ example: 'user@example.com' }),
		password: z.string().min(8).openapi({ example: 'password123' }),
		name: z.string().min(1).openapi({ example: 'John Doe' }),
	})
	.openapi('SignUp')

export const SignInSchema = z
	.object({
		email: z.string().email().openapi({ example: 'user@example.com' }),
		password: z.string().min(1).openapi({ example: 'password123' }),
	})
	.openapi('SignIn')

export const SessionSchema = z
	.object({
		token: z.string().openapi({ example: 'session_xyz789' }),
		expiresAt: z.string().datetime().openapi({ example: '2024-12-08T00:00:00Z' }),
	})
	.openapi('Session')

export const AuthResponseSchema = z
	.object({
		user: UserSchema,
		session: SessionSchema,
	})
	.openapi('AuthResponse')

// Chat schemas
export const MessageRoleSchema = z
	.enum(['user', 'assistant', 'system'])
	.openapi({ example: 'user' })

export const ChatRequestSchema = z
	.object({
		message: z.string().min(1).openapi({ example: 'Hello, how are you?' }),
		sessionId: z.string().optional().openapi({ example: 'session_abc123' }),
		metadata: MetadataSchema.optional().openapi({ example: { userId: 'user_123' } }),
	})
	.openapi('ChatRequest')

export const MessageSchema = z
	.object({
		id: z.string().openapi({ example: 'msg_abc123' }),
		conversationId: z.string().openapi({ example: 'conv_xyz789' }),
		role: MessageRoleSchema,
		content: z.string().openapi({ example: 'Hello! How can I help you?' }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Message')

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

// Usage schemas
export const UsageQuerySchema = z.object({
	startDate: z.string().optional().openapi({ example: '2024-11-01T00:00:00Z' }),
	endDate: z.string().optional().openapi({ example: '2024-12-01T00:00:00Z' }),
	agentId: z.string().optional().openapi({ example: 'agent_abc123' }),
	groupBy: z.enum(['day', 'week', 'month']).optional().openapi({ example: 'day' }),
})

export const UsageByAgentSchema = z
	.object({
		agentId: z.string().openapi({ example: 'agent_abc123' }),
		agentName: z.string().openapi({ example: 'Customer Support Agent' }),
		messages: z.number().openapi({ example: 800 }),
		tokensIn: z.number().openapi({ example: 30000 }),
		tokensOut: z.number().openapi({ example: 45000 }),
		cost: z.number().openapi({ example: 0.75 }),
	})
	.openapi('UsageByAgent')

export const UsageByDaySchema = z
	.object({
		date: z.string().openapi({ example: '2024-12-01' }),
		messages: z.number().openapi({ example: 100 }),
		tokensIn: z.number().openapi({ example: 4000 }),
		tokensOut: z.number().openapi({ example: 6000 }),
		cost: z.number().openapi({ example: 0.1 }),
	})
	.openapi('UsageByDay')

export const UsageStatsSchema = z
	.object({
		totalMessages: z.number().openapi({ example: 1234 }),
		totalTokensIn: z.number().openapi({ example: 50000 }),
		totalTokensOut: z.number().openapi({ example: 75000 }),
		totalCost: z.number().openapi({ example: 1.25 }),
		averageLatencyMs: z.number().optional().openapi({ example: 250 }),
		byAgent: z.array(UsageByAgentSchema).optional(),
		byDay: z.array(UsageByDaySchema).optional(),
		byModel: z
			.array(
				z.object({
					model: z.string().openapi({ example: 'llama-3.3-70b-instruct' }),
					messages: z.number().openapi({ example: 800 }),
					tokensIn: z.number().openapi({ example: 30000 }),
					tokensOut: z.number().openapi({ example: 45000 }),
					cost: z.number().openapi({ example: 0.75 }),
				}),
			)
			.optional(),
	})
	.openapi('UsageStats')

export const UsageResponseSchema = z
	.object({
		usage: UsageStatsSchema,
		period: z.object({
			startDate: z.string().datetime().openapi({ example: '2024-11-01T00:00:00Z' }),
			endDate: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		}),
	})
	.openapi('UsageResponse')

export const AgentUsageResponseSchema = z
	.object({
		agentId: z.string().openapi({ example: 'agent_abc123' }),
		usage: UsageStatsSchema,
	})
	.openapi('AgentUsageResponse')
