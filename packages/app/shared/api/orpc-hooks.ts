/**
 * oRPC React Query Hooks
 *
 * Type-safe hooks using oRPC client with TanStack Query.
 * Types are fully inferred from the server - no manual annotations needed!
 */

'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@hare/api-client'

// =============================================================================
// Agent Hooks
// =============================================================================

export function useAgentsQuery() {
	return useQuery({
		queryKey: ['agents'],
		queryFn: () => orpc.agents.list({}),
	})
}

export function useAgentQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['agents', id],
		queryFn: () => orpc.agents.get({ id: id! }),
		enabled: !!id,
	})
}

export interface ValidationIssue {
	field: string
	message: string
	severity: 'error' | 'warning'
}

export function useAgentPreviewQuery(options: {
	name?: string
	description?: string
	model?: string
	instructions?: string
	config?: Record<string, unknown>
	toolIds?: string[]
	enabled?: boolean
}) {
	const { enabled, ...previewInput } = options
	return useQuery({
		queryKey: ['agents', 'preview', previewInput],
		queryFn: () => orpc.agents.preview(previewInput),
		enabled: enabled !== false,
	})
}

export function useCreateAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Parameters<typeof orpc.agents.create>[0]) => orpc.agents.create(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
		},
	})
}

export function useUpdateAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Parameters<typeof orpc.agents.update>[0]) => orpc.agents.update(input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id] })
		},
	})
}

export function useDeleteAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) => orpc.agents.delete(input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id] })
		},
	})
}

export function useDeployAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) => orpc.agents.deploy(input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id] })
		},
	})
}

export function useUndeployAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) => orpc.agents.undeploy(input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id] })
		},
	})
}

// =============================================================================
// Tool Hooks
// =============================================================================

export function useToolsQuery() {
	return useQuery({
		queryKey: ['tools'],
		queryFn: () => orpc.tools.list({}),
	})
}

export function useToolQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['tools', id],
		queryFn: () => orpc.tools.get({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateToolMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Parameters<typeof orpc.tools.create>[0]) => orpc.tools.create(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools'] })
		},
	})
}

export function useUpdateToolMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Parameters<typeof orpc.tools.update>[0]) => orpc.tools.update(input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['tools'] })
			queryClient.invalidateQueries({ queryKey: ['tools', variables.id] })
		},
	})
}

export function useDeleteToolMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) => orpc.tools.delete(input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['tools'] })
			queryClient.invalidateQueries({ queryKey: ['tools', variables.id] })
		},
	})
}

export function useTestToolMutation() {
	return useMutation({
		mutationFn: (input: Parameters<typeof orpc.tools.test>[0]) => orpc.tools.test(input),
	})
}

export function useTestExistingToolMutation() {
	return useMutation({
		mutationFn: (input: Parameters<typeof orpc.tools.testExisting>[0]) =>
			orpc.tools.testExisting(input),
	})
}

// =============================================================================
// API Key Hooks
// =============================================================================

export function useApiKeysQuery() {
	return useQuery({
		queryKey: ['api-keys'],
		queryFn: () => orpc.apiKeys.list({}),
	})
}

export function useApiKeyQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['api-keys', id],
		queryFn: () => orpc.apiKeys.get({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateApiKeyMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: {
			name: string
			permissions?: { scopes?: string[]; agentIds?: string[] } | null
			expiresAt?: string
		}) => orpc.apiKeys.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] })
		},
	})
}

export function useUpdateApiKeyMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: {
			id: string
			name?: string
			permissions?: { scopes?: string[]; agentIds?: string[] } | null
		}) => orpc.apiKeys.update(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] })
			queryClient.invalidateQueries({ queryKey: ['api-keys', variables.id] })
		},
	})
}

export function useDeleteApiKeyMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: { id: string }) => orpc.apiKeys.delete(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] })
			queryClient.invalidateQueries({ queryKey: ['api-keys', variables.id] })
		},
	})
}

// =============================================================================
// Workspace Hooks
// =============================================================================

export function useWorkspacesQuery() {
	return useQuery({
		queryKey: ['workspaces'],
		queryFn: () => orpc.workspaces.list({}),
	})
}

export function useCurrentWorkspaceQuery() {
	return useQuery({
		queryKey: ['workspaces', 'current'],
		queryFn: () => orpc.workspaces.getCurrent({}),
	})
}

export function useWorkspaceQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', id],
		queryFn: () => orpc.workspaces.get({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: { name: string; slug: string; description?: string }) =>
			orpc.workspaces.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

export function useUpdateWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: { id: string; name?: string; description?: string }) =>
			orpc.workspaces.update(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id] })
		},
	})
}

export function useDeleteWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: { id: string }) => orpc.workspaces.delete(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id] })
		},
	})
}

export function useEnsureDefaultWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () => orpc.workspaces.ensureDefault({}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

// =============================================================================
// Schedule Hooks
// =============================================================================

export function useSchedulesQuery(agentId?: string) {
	return useQuery({
		queryKey: ['schedules', { agentId }],
		queryFn: () => orpc.schedules.list({ agentId }),
	})
}

export function useScheduleQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['schedules', id],
		queryFn: () => orpc.schedules.get({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateScheduleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: {
			agentId: string
			type: 'one-time' | 'recurring'
			action: string
			executeAt?: string
			cron?: string
			payload?: Record<string, unknown>
		}) => orpc.schedules.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
		},
	})
}

export function useUpdateScheduleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: {
			id: string
			action?: string
			executeAt?: string
			cron?: string
			payload?: Record<string, unknown>
			status?: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled'
		}) => orpc.schedules.update(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function useDeleteScheduleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: { id: string }) => orpc.schedules.delete(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function usePauseScheduleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: { id: string }) => orpc.schedules.pause(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function useResumeScheduleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: { id: string }) => orpc.schedules.resume(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function useScheduleExecutionsQuery(scheduleId: string | undefined) {
	return useQuery({
		queryKey: ['schedules', scheduleId, 'executions'],
		queryFn: () => orpc.schedules.getExecutions({ id: scheduleId! }),
		enabled: !!scheduleId,
	})
}

/**
 * Get execution history for all schedules of an agent
 * Note: This fetches schedules first, then aggregates their executions
 */
export function useAgentExecutionsQuery(options: { agentId?: string; limit?: number }) {
	const { agentId, limit = 10 } = options
	const { data: schedulesData } = useSchedulesQuery(agentId)

	return useQuery({
		queryKey: ['agents', agentId, 'executions', { limit }],
		queryFn: async () => {
			if (!schedulesData?.schedules?.length) {
				return { executions: [] }
			}
			// Fetch executions from each schedule and combine them
			const allExecutions = await Promise.all(
				schedulesData.schedules.map((s) => orpc.schedules.getExecutions({ id: s.id })),
			)
			const combined = allExecutions.flatMap((r) => r.executions)
			// Sort by startedAt descending and limit
			const sorted = combined
				.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
				.slice(0, limit)
			return { executions: sorted }
		},
		enabled: !!agentId && !!schedulesData?.schedules,
	})
}

// =============================================================================
// Workspace Members Hooks
// =============================================================================

export function useWorkspaceMembersQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'members'],
		queryFn: () => orpc.workspaceMembers.listMembers({ id: workspaceId! }),
		enabled: !!workspaceId,
	})
}

export function useWorkspaceInvitationsQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'invitations'],
		queryFn: () => orpc.workspaceMembers.listInvitations({ id: workspaceId! }),
		enabled: !!workspaceId,
	})
}

export function useSendInvitationMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: {
			id: string
			email: string
			role?: 'admin' | 'member' | 'viewer'
		}) => orpc.workspaceMembers.sendInvitation(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'invitations'] })
		},
	})
}

export function useRevokeInvitationMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: { id: string; inviteId: string }) =>
			orpc.workspaceMembers.revokeInvitation(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'invitations'] })
		},
	})
}

export function useRemoveMemberMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: { id: string; userId: string }) =>
			orpc.workspaceMembers.removeMember(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'members'] })
		},
	})
}

export function useUpdateMemberRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: {
			id: string
			userId: string
			role: 'admin' | 'member' | 'viewer'
		}) => orpc.workspaceMembers.updateMemberRole(data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'members'] })
		},
	})
}

// =============================================================================
// User Settings Hooks
// =============================================================================

export function useUserPreferencesQuery() {
	return useQuery({
		queryKey: ['user', 'preferences'],
		queryFn: () => orpc.userSettings.get({}),
	})
}

export function useUpdateUserPreferencesMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: { emailNotifications?: boolean; usageAlerts?: boolean }) =>
			orpc.userSettings.update(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['user', 'preferences'] })
		},
	})
}

// =============================================================================
// Usage Hooks
// =============================================================================

export function useUsageQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['usage', workspaceId],
		queryFn: () => orpc.usage.getWorkspaceUsage({}),
		enabled: !!workspaceId,
	})
}

export function useWorkspaceUsageQuery(options?: { startDate?: string; endDate?: string }) {
	return useQuery({
		queryKey: ['usage', options],
		queryFn: () => orpc.usage.getWorkspaceUsage(options || {}),
	})
}

export function useAgentUsageQuery(agentId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'agents', agentId],
		queryFn: () => orpc.usage.getAgentUsage({ id: agentId! }),
		enabled: !!agentId,
	})
}

// =============================================================================
// Analytics Hooks
// =============================================================================

export function useAnalyticsQuery(options?: {
	startDate?: string
	endDate?: string
	agentId?: string
	groupBy?: 'day' | 'week' | 'month'
}) {
	return useQuery({
		queryKey: ['analytics', options],
		queryFn: () => orpc.analytics.get(options || {}),
	})
}

// =============================================================================
// Logs Hooks
// =============================================================================

export function useLogsQuery(options?: {
	userId?: string
	agentId?: string
	status?: number
	startDate?: string
	endDate?: string
	limit?: number
	offset?: number
}) {
	return useQuery({
		queryKey: ['logs', options],
		queryFn: () => orpc.logs.list(options || {}),
	})
}

export function useLogStatsQuery(options?: {
	userId?: string
	agentId?: string
	status?: number
	startDate?: string
	endDate?: string
}) {
	return useQuery({
		queryKey: ['logs', 'stats', options],
		queryFn: () => orpc.logs.getStats(options || {}),
	})
}
