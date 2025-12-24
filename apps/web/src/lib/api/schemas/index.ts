/**
 * API Schemas
 *
 * Zod schemas for API request/response validation.
 * Organized by domain for better maintainability.
 */

// Common schemas
export {
	ErrorSchema,
	IdParamSchema,
	JsonSchemaPropertySchema,
	JsonSchemaSchema,
	JsonValueSchema,
	MetadataSchema,
	SuccessSchema,
} from './common'

// Agent schemas
export {
	AgentConfigSchema,
	AgentSchema,
	AgentStatusSchema,
	CreateAgentSchema,
	DeployAgentSchema,
	DeploymentSchema,
	UpdateAgentSchema,
} from './agents'

// Workspace schemas
export {
	CreateWorkspaceSchema,
	UpdateWorkspaceSchema,
	WorkspaceRoleSchema,
	WorkspaceSchema,
} from './workspaces'

// Tool schemas
export {
	CreateToolSchema,
	ToolConfigSchema,
	ToolSchema,
	ToolTypeSchema,
	UpdateToolSchema,
} from './tools'

// Auth schemas
export {
	AuthResponseSchema,
	SessionSchema,
	SignInSchema,
	SignUpSchema,
	UserSchema,
} from './auth'

// Chat schemas
export {
	ChatRequestSchema,
	ConversationSchema,
	MessageRoleSchema,
	MessageSchema,
} from './chat'

// Usage schemas
export {
	AgentUsageResponseSchema,
	UsageByAgentSchema,
	UsageByDaySchema,
	UsageQuerySchema,
	UsageResponseSchema,
	UsageStatsSchema,
} from './usage'
