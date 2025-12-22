export { authMiddleware, optionalAuthMiddleware } from './auth'
export { workspaceMiddleware, requirePermission, hasPermission } from './workspace'
export { apiKeyMiddleware, hasAgentAccess, hasScope, generateApiKey } from './api-key'

// Re-export types from the central types module
export type {
	AuthUser,
	AuthSession,
	AuthVariables,
	WorkspaceInfo,
	WorkspaceVariables,
	WorkspaceRole,
	ApiKeyInfo,
	ApiKeyVariables,
	HonoEnv,
	AuthEnv,
	WorkspaceEnv,
	ApiKeyEnv,
	OptionalAuthEnv,
} from '../types'
