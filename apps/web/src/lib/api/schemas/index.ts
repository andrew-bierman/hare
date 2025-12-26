/**
 * API Schemas
 *
 * Zod schemas for API request/response validation.
 * Organized by domain for better maintainability.
 */

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
// Tool schemas
export {
	CreateToolSchema,
	ToolConfigSchema,
	ToolSchema,
	ToolTypeSchema,
	UpdateToolSchema,
} from './tools'
// Usage schemas
export {
	AgentUsageResponseSchema,
	UsageByAgentSchema,
	UsageByDaySchema,
	UsageQuerySchema,
	UsageResponseSchema,
	UsageStatsSchema,
} from './usage'
// Workspace schemas
export {
	CreateWorkspaceSchema,
	UpdateWorkspaceSchema,
	WorkspaceRoleSchema,
	WorkspaceSchema,
} from './workspaces'
