// Re-export types from the central types module
export type {
	ApiKeyEnv,
	ApiKeyInfo,
	ApiKeyVariables,
	AuthEnv,
	AuthSession,
	AuthUser,
	AuthVariables,
	HonoEnv,
	OptionalAuthEnv,
	WorkspaceEnv,
	WorkspaceInfo,
	WorkspaceRole,
	WorkspaceVariables,
} from '@hare/types'
export {
	apiKeyMiddleware,
	generateApiKey,
	hasAgentAccess,
	hasScope,
} from './api-key'
export { authMiddleware, optionalAuthMiddleware } from './auth'
export { aiChatFeatureMiddleware } from './beta-access'
export {
	getLogStats,
	getLogs,
	type LogQueryParams,
	type LogStats,
	loggingMiddleware,
	type RequestLog,
} from './logging'
export {
	apiRateLimiter,
	chatRateLimiter,
	externalApiRateLimiter,
	strictRateLimiter,
} from './rate-limit'
export { corsMiddleware, securityHeadersMiddleware } from './security'
export {
	blockDangerousHeaders,
	csrfProtection,
	requestSizeLimit,
	requestValidation,
	requireContentType,
	validateJsonBody,
	type RequestSizeLimitOptions,
} from '@hare/security'
export {
	hasPermission,
	requirePermission,
	workspaceMiddleware,
} from './workspace'
