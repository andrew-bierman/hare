/**
 * TanStack Query Key Factories
 *
 * Centralized query key management for consistent cache invalidation.
 * Uses factory pattern for type-safe, hierarchical query keys.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
 */

/**
 * Agent query keys
 */
export const agentKeys = {
	all: ['agents'] as const,
	lists: () => [...agentKeys.all, 'list'] as const,
	list: (workspaceId: string) => [...agentKeys.lists(), workspaceId] as const,
	details: () => [...agentKeys.all, 'detail'] as const,
	detail: (workspaceId: string, id: string) => [...agentKeys.details(), workspaceId, id] as const,
	preview: (workspaceId: string, id: string, overrides?: unknown) =>
		[...agentKeys.all, 'preview', workspaceId, id, overrides] as const,
}

/**
 * Workspace query keys
 */
export const workspaceKeys = {
	all: ['workspaces'] as const,
	lists: () => [...workspaceKeys.all, 'list'] as const,
	list: () => [...workspaceKeys.lists()] as const,
	details: () => [...workspaceKeys.all, 'detail'] as const,
	detail: (id: string) => [...workspaceKeys.details(), id] as const,
	members: (workspaceId: string) => [...workspaceKeys.all, 'members', workspaceId] as const,
	invitations: (workspaceId: string) => [...workspaceKeys.all, 'invitations', workspaceId] as const,
}

/**
 * Tool query keys
 */
export const toolKeys = {
	all: ['tools'] as const,
	lists: () => [...toolKeys.all, 'list'] as const,
	list: (workspaceId: string) => [...toolKeys.lists(), workspaceId] as const,
	details: () => [...toolKeys.all, 'detail'] as const,
	detail: (workspaceId: string, id: string) => [...toolKeys.details(), workspaceId, id] as const,
	test: (workspaceId: string, id: string) => [...toolKeys.all, 'test', workspaceId, id] as const,
}

/**
 * API key query keys
 */
export const apiKeyKeys = {
	all: ['api-keys'] as const,
	lists: () => [...apiKeyKeys.all, 'list'] as const,
	list: (workspaceId: string) => [...apiKeyKeys.lists(), workspaceId] as const,
	details: () => [...apiKeyKeys.all, 'detail'] as const,
	detail: (workspaceId: string, id: string) => [...apiKeyKeys.details(), workspaceId, id] as const,
}

/**
 * Conversation/chat query keys
 */
export const conversationKeys = {
	all: ['conversations'] as const,
	lists: () => [...conversationKeys.all, 'list'] as const,
	list: (agentId: string, workspaceId: string) =>
		[...conversationKeys.lists(), agentId, workspaceId] as const,
	details: () => [...conversationKeys.all, 'detail'] as const,
	detail: (id: string) => [...conversationKeys.details(), id] as const,
	messages: (conversationId: string) =>
		[...conversationKeys.all, 'messages', conversationId] as const,
	infinite: (agentId: string, workspaceId: string) =>
		[...conversationKeys.all, 'infinite', agentId, workspaceId] as const,
}

/**
 * Memory query keys
 */
export const memoryKeys = {
	all: ['memories'] as const,
	lists: () => [...memoryKeys.all, 'list'] as const,
	list: (agentId: string, workspaceId: string) =>
		[...memoryKeys.lists(), agentId, workspaceId] as const,
	search: (agentId: string, workspaceId: string, query: string) =>
		[...memoryKeys.all, 'search', agentId, workspaceId, query] as const,
}

/**
 * Log query keys
 */
export const logKeys = {
	all: ['logs'] as const,
	lists: () => [...logKeys.all, 'list'] as const,
	list: (workspaceId: string, filters?: unknown) =>
		[...logKeys.lists(), workspaceId, filters] as const,
	stats: (workspaceId: string) => [...logKeys.all, 'stats', workspaceId] as const,
	infinite: (workspaceId: string, filters?: unknown) =>
		[...logKeys.all, 'infinite', workspaceId, filters] as const,
}

/**
 * Analytics query keys
 */
export const analyticsKeys = {
	all: ['analytics'] as const,
	overview: (workspaceId: string, period?: string) =>
		[...analyticsKeys.all, 'overview', workspaceId, period] as const,
	usage: (workspaceId: string, period?: string) =>
		[...analyticsKeys.all, 'usage', workspaceId, period] as const,
	agents: (workspaceId: string, period?: string) =>
		[...analyticsKeys.all, 'agents', workspaceId, period] as const,
}

/**
 * Billing query keys
 */
export const billingKeys = {
	all: ['billing'] as const,
	status: (workspaceId: string) => [...billingKeys.all, 'status', workspaceId] as const,
	plans: () => [...billingKeys.all, 'plans'] as const,
	invoices: (workspaceId: string) => [...billingKeys.all, 'invoices', workspaceId] as const,
}

/**
 * Schedule query keys
 */
export const scheduleKeys = {
	all: ['schedules'] as const,
	lists: () => [...scheduleKeys.all, 'list'] as const,
	list: (agentId: string, workspaceId: string) =>
		[...scheduleKeys.lists(), agentId, workspaceId] as const,
	details: () => [...scheduleKeys.all, 'detail'] as const,
	detail: (id: string) => [...scheduleKeys.details(), id] as const,
	executions: (scheduleId: string) => [...scheduleKeys.all, 'executions', scheduleId] as const,
}

/**
 * Auth query keys
 */
export const authKeys = {
	all: ['auth'] as const,
	session: () => [...authKeys.all, 'session'] as const,
	providers: () => [...authKeys.all, 'providers'] as const,
}
