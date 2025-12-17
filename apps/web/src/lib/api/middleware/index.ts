export { authMiddleware, optionalAuthMiddleware } from './auth'
export type { AuthUser, AuthVariables } from './auth'

export { workspaceMiddleware, requirePermission, hasPermission } from './workspace'
export type { WorkspaceRole, WorkspaceInfo, WorkspaceVariables } from './workspace'

export { apiKeyMiddleware, hasAgentAccess, hasScope, generateApiKey } from './api-key'
export type { ApiKeyInfo, ApiKeyVariables } from './api-key'
