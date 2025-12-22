export { authMiddleware, optionalAuthMiddleware } from './auth'
export { workspaceMiddleware, requirePermission, hasPermission } from './workspace'
export { apiKeyMiddleware, hasAgentAccess, hasScope, generateApiKey } from './api-key'
export { rateLimiter, strictRateLimiter, chatRateLimiter, apiRateLimiter } from './rate-limit'
export { requestId } from './request-id'
export { secureHeaders } from './secure-headers'
export { timing, measureTiming } from './timing'

// Pre-combined middleware chains for common patterns
export {
	authenticated,
	protectedRoute,
	readRoute,
	writeRoute,
	adminRoute,
	ownerRoute,
	rateLimitedRoute,
	strictAdminRoute,
	chatRoute,
} from './combined'

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
