/**
 * Eden Treaty React Query Hooks
 *
 * Type-safe hooks using Eden Treaty client with TanStack Query.
 * Types are fully inferred from the Elysia server — no manual annotations needed!
 *
 * Eden Treaty API pattern:
 * - GET  /agents     → api.api.agents.index.get()
 * - GET  /agents/:id → api.api.agents({ id }).get()
 * - POST /agents     → api.api.agents.index.post({ body })
 * - PATCH /agents/:id → api.api.agents({ id }).patch({ body })
 * - DELETE /agents/:id → api.api.agents({ id }).delete()
 */

'use client'

import { api, getWorkspaceId } from '@hare/api/client'
import type { AuditAction } from '@hare/config'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Helper to unwrap Eden Treaty response (returns data or throws)
async function unwrap<T>(promise: Promise<{ data: T | null; error: unknown }>): Promise<T> {
	const { data, error } = await promise
	if (error) throw error
	return data as T
}

// =============================================================================
// Agent Hooks
// =============================================================================

export function useAgentsQuery() {
	return useQuery({
		queryKey: ['agents'],
		queryFn: () => unwrap(api.api.agents.index.get()),
		enabled: !!getWorkspaceId(),
	})
}

export function useAgentQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['agents', id],
		queryFn: () => unwrap(api.api.agents({ id: id! }).get()),
		enabled: !!id,
	})
}

export interface ValidationIssue {
	field: string
	message: string
	type: 'error' | 'warning'
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
		queryFn: () => unwrap(api.api.agents.preview.post(previewInput)),
		enabled: enabled !== false,
	})
}

export function useCreateAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: {
			name: string
			model: string
			instructions: string
			description?: string
			config?: Record<string, unknown>
			systemToolsEnabled?: boolean
			toolIds?: string[]
		}) => unwrap(api.api.agents.index.post(input)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['usage'] })
			queryClient.invalidateQueries({ queryKey: ['analytics'] })
		},
	})
}

export function useUpdateAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = input
			return unwrap(api.api.agents({ id }).patch(body as any))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id] })
		},
	})
}

export function useDeleteAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) =>
			unwrap(api.api.agents({ id: input.id }).delete()),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id] })
		},
	})
}

export function useDeployAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) =>
			unwrap(api.api.agents({ id: input.id }).deploy.post({})),
		onSuccess: async (_, variables) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['agents'] }),
				queryClient.invalidateQueries({ queryKey: ['agents', variables.id] }),
				queryClient.invalidateQueries({ queryKey: ['agents', variables.id, 'versions'] }),
				queryClient.invalidateQueries({ queryKey: ['usage'] }),
			])
		},
	})
}

export function useAgentVersionsQuery(
	agentId: string | undefined,
	options?: { limit?: number; offset?: number },
) {
	return useQuery({
		queryKey: ['agents', agentId, 'versions', options],
		queryFn: () =>
			unwrap(api.api.agents({ id: agentId! }).versions.get({ query: options })),
		enabled: !!agentId,
	})
}

export function useRollbackAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string; version: number }) =>
			unwrap(api.api.agents({ id: input.id }).rollback.post({ version: input.version })),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id, 'versions'] })
		},
	})
}

export function useUndeployAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) =>
			unwrap(api.api.agents({ id: input.id }).undeploy.post({})),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id] })
		},
	})
}

export function useCloneAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) =>
			unwrap(api.api.agents({ id: input.id }).clone.post({})),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
		},
	})
}

// =============================================================================
// Tool Hooks
// =============================================================================

export function useToolsQuery() {
	return useQuery({
		queryKey: ['tools'],
		queryFn: () => unwrap(api.api.tools.index.get()),
		enabled: !!getWorkspaceId(),
	})
}

export function useToolQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['tools', id],
		queryFn: () => unwrap(api.api.tools({ id: id! }).get()),
		enabled: !!id,
	})
}

export function useCreateToolMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Record<string, unknown>) =>
			unwrap(api.api.tools.index.post(input as any)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools'] })
		},
	})
}

export function useUpdateToolMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = input
			return unwrap(api.api.tools({ id }).patch(body as any))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['tools'] })
			queryClient.invalidateQueries({ queryKey: ['tools', variables.id] })
		},
	})
}

export function useDeleteToolMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) =>
			unwrap(api.api.tools({ id: input.id }).delete()),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['tools'] })
			queryClient.invalidateQueries({ queryKey: ['tools', variables.id] })
		},
	})
}

export function useTestToolMutation() {
	return useMutation({
		mutationFn: (input: Record<string, unknown>) =>
			unwrap(api.api.tools.test.post(input as any)),
	})
}

export function useTestExistingToolMutation() {
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = input
			return unwrap(api.api.tools({ id })['test-existing'].post(body as any))
		},
	})
}

// =============================================================================
// Webhook Hooks
// =============================================================================

export function useWebhooksQuery(agentId: string | undefined) {
	return useQuery({
		queryKey: ['webhooks', agentId],
		queryFn: () => unwrap(api.api.webhooks.index.get({ query: { agentId: agentId! } })),
		enabled: !!agentId,
	})
}

export function useCreateWebhookMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Record<string, unknown>) =>
			unwrap(api.api.webhooks.index.post(input as any)),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['webhooks', (variables as any).agentId] })
		},
	})
}

export function useUpdateWebhookMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = input
			return unwrap(api.api.webhooks({ id }).patch(body as any))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
		},
	})
}

export function useDeleteWebhookMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) =>
			unwrap(api.api.webhooks({ id: input.id }).delete()),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
		},
	})
}

// =============================================================================
// API Key Hooks
// =============================================================================

export function useApiKeysQuery() {
	return useQuery({
		queryKey: ['api-keys'],
		queryFn: () => unwrap(api.api['api-keys'].index.get()),
	})
}

export function useApiKeyQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['api-keys', id],
		queryFn: () => unwrap(api.api['api-keys']({ id: id! }).get()),
		enabled: !!id,
	})
}

export function useCreateApiKeyMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: {
			name: string
			permissions?: { scopes?: string[]; agentIds?: string[] } | null
			expiresAt?: string
		}) => unwrap(api.api['api-keys'].index.post(data)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] })
		},
	})
}

export function useUpdateApiKeyMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string; name?: string; permissions?: Record<string, unknown> | null }) => {
			const { id, ...body } = data
			return unwrap(api.api['api-keys']({ id }).patch(body as any))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] })
			queryClient.invalidateQueries({ queryKey: ['api-keys', variables.id] })
		},
	})
}

export function useDeleteApiKeyMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string }) =>
			unwrap(api.api['api-keys']({ id: data.id }).delete()),
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
		queryFn: () => unwrap(api.api.workspaces.index.get()),
	})
}

export function useCurrentWorkspaceQuery() {
	return useQuery({
		queryKey: ['workspaces', 'current'],
		queryFn: () => unwrap(api.api.workspaces.current.get()),
	})
}

export function useWorkspaceQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', id],
		queryFn: () => unwrap(api.api.workspaces({ id: id! }).get()),
		enabled: !!id,
	})
}

export function useCreateWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { name: string; slug: string; description?: string }) =>
			unwrap(api.api.workspaces.index.post(data)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

export function useUpdateWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string; name?: string; description?: string }) => {
			const { id, ...body } = data
			return unwrap(api.api.workspaces({ id }).patch(body))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id] })
		},
	})
}

export function useDeleteWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string }) =>
			unwrap(api.api.workspaces({ id: data.id }).delete()),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id] })
		},
	})
}

export function useEnsureDefaultWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () => unwrap(api.api.workspaces['ensure-default'].post({})),
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
		queryFn: () => unwrap(api.api.schedules.index.get({ query: { agentId } })),
	})
}

export function useScheduleQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['schedules', id],
		queryFn: () => unwrap(api.api.schedules({ id: id! }).get()),
		enabled: !!id,
	})
}

export function useCreateScheduleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			unwrap(api.api.schedules.index.post(data as any)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
		},
	})
}

export function useUpdateScheduleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = data
			return unwrap(api.api.schedules({ id }).patch(body as any))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function useDeleteScheduleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string }) =>
			unwrap(api.api.schedules({ id: data.id }).delete()),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function usePauseScheduleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string }) =>
			unwrap(api.api.schedules({ id: data.id }).pause.post({})),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function useResumeScheduleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string }) =>
			unwrap(api.api.schedules({ id: data.id }).resume.post({})),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function useScheduleExecutionsQuery(scheduleId: string | undefined) {
	return useQuery({
		queryKey: ['schedules', scheduleId, 'executions'],
		queryFn: () => unwrap(api.api.schedules({ id: scheduleId! }).executions.get()),
		enabled: !!scheduleId,
	})
}

export function useAgentExecutionsQuery(options: { agentId?: string; limit?: number }) {
	const { agentId, limit = 10 } = options
	const { data: schedulesData } = useSchedulesQuery(agentId)

	return useQuery({
		queryKey: ['agents', agentId, 'executions', { limit }],
		queryFn: async () => {
			if (!schedulesData?.schedules?.length) return { executions: [] }
			const allExecutions = await Promise.all(
				schedulesData.schedules.map((s: { id: string }) =>
					unwrap(api.api.schedules({ id: s.id }).executions.get()),
				),
			)
			const combined = allExecutions.flatMap((r: any) => r.executions)
			const sorted = combined
				.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
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
		queryFn: () => unwrap(api.api['workspace-members']({ id: workspaceId! }).members.get()),
	})
}

export function useWorkspaceInvitationsQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'invitations'],
		queryFn: () => unwrap(api.api['workspace-members']({ id: workspaceId! }).invitations.get()),
	})
}

export function useSendInvitationMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string; email: string; role?: 'admin' | 'member' | 'viewer' }) => {
			const { id, ...body } = data
			return unwrap(api.api['workspace-members']({ id }).invite.post(body))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'invitations'] })
		},
	})
}

export function useRevokeInvitationMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string; inviteId: string }) =>
			unwrap(api.api['workspace-members']({ id: data.id }).invitations({ inviteId: data.inviteId }).delete()),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'invitations'] })
		},
	})
}

export function useRemoveMemberMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string; userId: string }) =>
			unwrap(api.api['workspace-members']({ id: data.id }).members({ userId: data.userId }).delete()),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'members'] })
		},
	})
}

export function useUpdateMemberRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string; userId: string; role: 'admin' | 'member' | 'viewer' }) => {
			const { id, userId, ...body } = data
			return unwrap(api.api['workspace-members']({ id }).members({ userId }).patch(body))
		},
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
		queryFn: () => unwrap(api.api['user-settings'].index.get()),
	})
}

export function useUpdateUserPreferencesMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { emailNotifications?: boolean; usageAlerts?: boolean }) =>
			unwrap(api.api['user-settings'].index.patch(data)),
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
		queryFn: () => unwrap(api.api.usage.index.get()),
	})
}

export function useWorkspaceUsageQuery(options?: { startDate?: string; endDate?: string }) {
	return useQuery({
		queryKey: ['usage', options],
		queryFn: () => unwrap(api.api.usage.index.get({ query: options })),
	})
}

export function useAgentUsageQuery(agentId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'agents', agentId],
		queryFn: () => unwrap(api.api.usage.agents({ id: agentId! }).get()),
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
		queryFn: () => unwrap(api.api.analytics.index.get({ query: options })),
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
		queryFn: () => unwrap(api.api.logs.index.get({ query: options })),
	})
}

export function useLogStatsQuery(options?: Record<string, unknown>) {
	return useQuery({
		queryKey: ['logs', 'stats', options],
		queryFn: () => unwrap(api.api.logs.stats.get({ query: options as any })),
	})
}

// =============================================================================
// Audit Logs Hooks
// =============================================================================

export function useAuditLogsQuery(options?: {
	action?: AuditAction
	resourceType?: string
	userId?: string
	dateFrom?: string
	dateTo?: string
	limit?: number
	offset?: number
}) {
	return useQuery({
		queryKey: ['audit-logs', options],
		queryFn: () => unwrap(api.api['audit-logs'].index.get({ query: options as any })),
	})
}

// =============================================================================
// Agent Health Hooks
// =============================================================================

export function useAgentHealthQuery(
	agentId: string | undefined,
	options?: { refetchInterval?: number },
) {
	return useQuery({
		queryKey: ['agents', agentId, 'health'],
		queryFn: () => unwrap(api.api.agents({ id: agentId! }).health.get()),
		enabled: !!agentId,
		refetchInterval: options?.refetchInterval,
	})
}

// =============================================================================
// Activity Feed Hooks
// =============================================================================

export function useActivityFeedQuery(options?: {
	agentId?: string
	eventType?: 'agent.invocation' | 'tool.call' | 'error'
	limit?: number
	refetchInterval?: number
}) {
	const { refetchInterval, ...queryInput } = options || {}
	const workspaceId = getWorkspaceId()
	return useQuery({
		queryKey: ['activity', queryInput],
		queryFn: () => unwrap(api.api.activity.index.get({ query: queryInput as any })),
		enabled: !!workspaceId,
		refetchInterval,
	})
}
