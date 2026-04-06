/**
 * Eden Treaty React Query Hooks
 *
 * Type-safe hooks using Eden Treaty client with TanStack Query.
 * Types are fully inferred from the Elysia server.
 *
 * Eden Treaty path mapping:
 * - GET  /agents       → client.api.agents.get()
 * - POST /agents       → client.api.agents.post(body)
 * - GET  /agents/:id   → client.api.agents({ id }).get()
 * - PATCH /agents/:id  → client.api.agents({ id }).patch(body)
 * - DELETE /agents/:id → client.api.agents({ id }).delete()
 * - POST /agents/:id/deploy → client.api.agents({ id }).deploy.post(body)
 */

'use client'

import { client, getWorkspaceId } from '@hare/api/client'
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
		queryFn: () => unwrap(client.api.agents.get()),
		enabled: !!getWorkspaceId(),
	})
}

export function useAgentQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['agents', id],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled: !!id
		queryFn: () => unwrap(client.api.agents({ id: id! }).get()),
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
		queryFn: () => unwrap(client.api.agents.preview.post(previewInput as any)),
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
		}) => unwrap(client.api.agents.post(input as any)),
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
			return unwrap(client.api.agents({ id }).patch(body as any))
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
		mutationFn: (input: { id: string }) => unwrap(client.api.agents({ id: input.id }).delete()),
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
			unwrap(client.api.agents({ id: input.id }).deploy.post({})),
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
			// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
			unwrap(client.api.agents({ id: agentId! }).versions.get({ query: options as any })),
		enabled: !!agentId,
	})
}

export function useRollbackAgentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string; version: number }) =>
			unwrap(client.api.agents({ id: input.id }).rollback.post({ version: input.version } as any)),
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
			unwrap(client.api.agents({ id: input.id }).undeploy.post({})),
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
			unwrap(client.api.agents({ id: input.id }).clone.post({})),
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
		queryFn: () => unwrap(client.api.tools.get()),
		enabled: !!getWorkspaceId(),
	})
}

export function useToolQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['tools', id],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api.tools({ id: id! }).get()),
		enabled: !!id,
	})
}

export function useCreateToolMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Record<string, unknown>) => unwrap(client.api.tools.post(input as any)),
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
			return unwrap(client.api.tools({ id }).patch(body as any))
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
		mutationFn: (input: { id: string }) => unwrap(client.api.tools({ id: input.id }).delete()),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['tools'] })
			queryClient.invalidateQueries({ queryKey: ['tools', variables.id] })
		},
	})
}

export function useTestToolMutation() {
	return useMutation({
		mutationFn: (input: Record<string, unknown>) =>
			unwrap(client.api.tools.test.post(input as any)),
	})
}

export function useTestExistingToolMutation() {
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = input
			return unwrap(client.api.tools({ id }).test.post(body as any))
		},
	})
}

// =============================================================================
// Webhook Hooks
// =============================================================================

export function useWebhooksQuery(agentId: string | undefined) {
	return useQuery({
		queryKey: ['webhooks', agentId],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api.webhooks({ agentId: agentId! }).get()),
		enabled: !!agentId,
	})
}

export function useCreateWebhookMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { agentId: string } & Record<string, unknown>) => {
			const { agentId, ...body } = input
			return unwrap(client.api.webhooks({ agentId }).post(body as any))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['webhooks', variables.agentId] })
		},
	})
}

export function useUpdateWebhookMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { agentId: string; webhookId: string } & Record<string, unknown>) => {
			const { agentId, webhookId, ...body } = input
			return unwrap((client.api.webhooks as any)({ agentId })({ webhookId }).patch(body))
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
		},
	})
}

export function useDeleteWebhookMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { agentId: string; webhookId: string }) =>
			unwrap(
				(client.api.webhooks as any)({ agentId: input.agentId })({
					webhookId: input.webhookId,
				}).delete(),
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
		},
	})
}

export function useRegenerateWebhookSecretMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { agentId: string; webhookId: string }) =>
			unwrap(
				(client.api.webhooks as any)({ agentId: input.agentId })({
					webhookId: input.webhookId,
				})['regenerate-secret'].post({}),
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
		},
	})
}

export function useWebhookDeliveriesQuery(options: { webhookId: string; enabled?: boolean }) {
	const { webhookId, enabled = true } = options
	return useQuery<{ deliveries: WebhookDelivery[]; total: number }>({
		queryKey: ['webhooks', webhookId, 'deliveries'],
		queryFn: () => unwrap((client.api.webhooks as any).webhooks({ webhookId }).deliveries.get()),
		enabled,
	})
}

export function useWebhookLogsQuery(options: {
	agentId: string
	webhookId: string
	enabled?: boolean
}) {
	const { agentId, webhookId, enabled = true } = options
	return useQuery<{ logs: WebhookLog[]; total: number }>({
		queryKey: ['webhooks', agentId, webhookId, 'logs'],
		queryFn: () => unwrap((client.api.webhooks as any)({ agentId })({ webhookId }).logs.get()),
		enabled,
	})
}

export function useRetryWebhookDeliveryMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { webhookId: string; deliveryId: string }) =>
			unwrap(
				(client.api.webhooks as any)
					.webhooks({ webhookId: input.webhookId })
					.deliveries({ deliveryId: input.deliveryId })
					.retry.post({}),
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
		},
	})
}

// Webhook types matching the server serialization
export interface Webhook {
	id: string
	agentId: string
	url: string
	secret: string
	events: string[]
	status: string
	description: string | null
	createdAt: string
	updatedAt: string
}

export interface WebhookDelivery {
	id: string
	webhookId: string
	event: string
	payload: unknown
	status: string
	statusCode: number | null
	responseBody: string | null
	attemptCount: number
	nextRetryAt: string | null
	createdAt: string
}

export interface WebhookLog {
	id: string
	webhookId: string
	event: string
	payload: unknown
	status: string
	responseStatus: number | null
	responseBody: string | null
	attempts: number
	error: string | null
	createdAt: string
	completedAt: string | null
}

// =============================================================================
// API Key Hooks
// =============================================================================

export function useApiKeysQuery() {
	return useQuery({
		queryKey: ['api-keys'],
		queryFn: () => unwrap(client.api['api-keys'].get()),
	})
}

export function useApiKeyQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['api-keys', id],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api['api-keys']({ id: id! }).get()),
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
		}) => unwrap(client.api['api-keys'].post(data as any)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] })
		},
	})
}

export function useUpdateApiKeyMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: {
			id: string
			name?: string
			permissions?: Record<string, unknown> | null
		}) => {
			const { id, ...body } = data
			return unwrap(client.api['api-keys']({ id }).patch(body as any))
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
		mutationFn: (data: { id: string }) => unwrap(client.api['api-keys']({ id: data.id }).delete()),
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
		queryFn: () => unwrap(client.api.workspaces.get()),
	})
}

export function useCurrentWorkspaceQuery() {
	return useQuery({
		queryKey: ['workspaces', 'current'],
		queryFn: () => unwrap(client.api.workspaces.current.get()),
	})
}

export function useWorkspaceQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', id],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api.workspaces({ id: id! }).get()),
		enabled: !!id,
	})
}

export function useCreateWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { name: string; slug: string; description?: string }) =>
			unwrap(client.api.workspaces.post(data as any)),
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
			return unwrap(client.api.workspaces({ id }).patch(body as any))
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
		mutationFn: (data: { id: string }) => unwrap(client.api.workspaces({ id: data.id }).delete()),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id] })
		},
	})
}

export function useEnsureDefaultWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () => unwrap(client.api.workspaces['ensure-default'].post({})),
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
		queryFn: () => unwrap(client.api.schedules.get({ query: { agentId } as any })),
	})
}

export function useScheduleQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['schedules', id],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api.schedules({ id: id! }).get()),
		enabled: !!id,
	})
}

export function useCreateScheduleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => unwrap(client.api.schedules.post(data as any)),
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
			return unwrap(client.api.schedules({ id }).patch(body as any))
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
		mutationFn: (data: { id: string }) => unwrap(client.api.schedules({ id: data.id }).delete()),
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
			unwrap(client.api.schedules({ id: data.id }).pause.post({})),
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
			unwrap(client.api.schedules({ id: data.id }).resume.post({})),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function useScheduleExecutionsQuery(scheduleId: string | undefined) {
	return useQuery({
		queryKey: ['schedules', scheduleId, 'executions'],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api.schedules({ id: scheduleId! }).executions.get()),
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
					unwrap(client.api.schedules({ id: s.id }).executions.get()),
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
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api['workspace-members']({ id: workspaceId! }).members.get()),
	})
}

export function useWorkspaceInvitationsQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'invitations'],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api['workspace-members']({ id: workspaceId! }).invites.get()),
	})
}

export function useSendInvitationMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string; email: string; role?: 'admin' | 'member' | 'viewer' }) => {
			const { id, ...body } = data
			return unwrap(client.api['workspace-members']({ id }).invites.post(body as any))
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
			unwrap(
				client.api['workspace-members']({ id: data.id })
					.invites({ inviteId: data.inviteId } as any)
					.delete(),
			),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'invitations'] })
		},
	})
}

export function useRemoveMemberMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string; userId: string }) =>
			unwrap(
				client.api['workspace-members']({ id: data.id })
					.members({ userId: data.userId } as any)
					.delete(),
			),
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
			return unwrap(
				client.api['workspace-members']({ id })
					.members({ userId } as any)
					.patch(body as any),
			)
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
		queryFn: () => unwrap(client.api.user.preferences.get()),
	})
}

export function useUpdateUserPreferencesMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { emailNotifications?: boolean; usageAlerts?: boolean }) =>
			unwrap(client.api.user.preferences.patch(data as any)),
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
		queryFn: () => unwrap(client.api.usage.get()),
	})
}

export function useWorkspaceUsageQuery(options?: { startDate?: string; endDate?: string }) {
	return useQuery({
		queryKey: ['usage', options],
		queryFn: () => unwrap(client.api.usage.get({ query: options as any })),
	})
}

export function useAgentUsageQuery(agentId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'agents', agentId],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api.usage.agents({ id: agentId! }).get()),
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
		queryFn: () => unwrap(client.api.analytics.get({ query: options as any })),
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
		queryFn: () => unwrap(client.api.logs.get({ query: options as any })),
	})
}

export function useLogStatsQuery(options?: Record<string, unknown>) {
	return useQuery({
		queryKey: ['logs', 'stats', options],
		queryFn: () => unwrap(client.api.logs.stats.get({ query: options as any })),
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
		queryFn: () => unwrap(client.api['audit-logs'].get({ query: options as any })),
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
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api.agents({ id: agentId! }).health.get()),
		enabled: !!agentId,
		refetchInterval: options?.refetchInterval,
	})
}

// =============================================================================
// Feedback Hooks
// =============================================================================

export function useFeedbackStatsMutation() {
	return useMutation({
		mutationFn: (input: { id: string; startDate?: string; endDate?: string }) =>
			unwrap(client.api.feedback.stats({ id: input.id }).get({ query: input as any })),
	})
}

export function useCreateFeedbackMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Record<string, unknown>) => unwrap(client.api.feedback.post(input as any)),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['feedback', (variables as any).agentId] })
		},
	})
}

// =============================================================================
// Knowledge Base Hooks
// =============================================================================

export function useKnowledgeBasesQuery() {
	return useQuery({
		queryKey: ['knowledge-bases'],
		queryFn: () => unwrap(client.api['knowledge-base'].get()),
		enabled: !!getWorkspaceId(),
	})
}

export function useKnowledgeBaseQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['knowledge-bases', id],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api['knowledge-base']({ id: id! }).get()),
		enabled: !!id,
	})
}

export function useCreateKnowledgeBaseMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Record<string, unknown>) =>
			unwrap(client.api['knowledge-base'].post(input as any)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] })
		},
	})
}

export function useDeleteKnowledgeBaseMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) =>
			unwrap(client.api['knowledge-base']({ id: input.id }).delete()),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] })
			queryClient.invalidateQueries({ queryKey: ['knowledge-bases', variables.id] })
		},
	})
}

export function useKnowledgeBaseDocumentsQuery(kbId: string | undefined) {
	return useQuery({
		queryKey: ['knowledge-bases', kbId, 'documents'],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api['knowledge-base']({ id: kbId! }).documents.get()),
		enabled: !!kbId,
	})
}

export function useAddDocumentUrlMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = input
			return unwrap(client.api['knowledge-base']({ id }).documents.url.post(body as any))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['knowledge-bases', variables.id, 'documents'] })
			queryClient.invalidateQueries({ queryKey: ['knowledge-bases', variables.id] })
		},
	})
}

// =============================================================================
// Guardrails Hooks
// =============================================================================

export function useGuardrailsQuery(agentId: string | undefined) {
	return useQuery({
		queryKey: ['guardrails', agentId],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api.guardrails.get({ query: { agentId: agentId! } as any })),
		enabled: !!agentId,
	})
}

export function useCreateGuardrailMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Record<string, unknown>) =>
			unwrap(client.api.guardrails.post(input as any)),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['guardrails', (variables as any).agentId] })
		},
	})
}

export function useUpdateGuardrailMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = input
			return unwrap(client.api.guardrails({ id }).patch(body as any))
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['guardrails'] })
		},
	})
}

export function useDeleteGuardrailMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) => unwrap(client.api.guardrails({ id: input.id }).delete()),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['guardrails'] })
		},
	})
}

export function useGuardrailViolationsQuery(options: {
	agentId: string
	limit?: number
	offset?: number
	enabled?: boolean
}) {
	const { agentId, limit, offset, enabled = true } = options
	return useQuery({
		queryKey: ['guardrails', 'violations', { agentId, limit, offset }],
		queryFn: () =>
			unwrap(client.api.guardrails.violations.get({ query: { agentId, limit, offset } as any })),
		enabled,
	})
}

// =============================================================================
// Business Analytics Hooks
// =============================================================================

export function useBusinessMetricsQuery(options?: {
	agentId?: string
	startDate?: string
	endDate?: string
}) {
	return useQuery({
		queryKey: ['business-analytics', 'metrics', options],
		queryFn: () => unwrap(client.api['business-analytics'].metrics.get({ query: options as any })),
		enabled: !!getWorkspaceId(),
	})
}

export function useAgentPerformanceQuery(options?: { startDate?: string; endDate?: string }) {
	return useQuery({
		queryKey: ['business-analytics', 'agent-performance', options],
		queryFn: () =>
			unwrap(
				client.api['business-analytics']['agent-performance'].get({
					query: options as any,
				}),
			),
		enabled: !!getWorkspaceId(),
	})
}

export function useSetOutcomeMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Record<string, unknown>) =>
			unwrap(client.api['business-analytics'].outcomes.post(input as any)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['business-analytics'] })
		},
	})
}

export function useConversationOutcomesQuery(options: {
	agentId: string
	limit?: number
	offset?: number
}) {
	return useQuery({
		queryKey: ['business-analytics', 'outcomes', options],
		queryFn: () =>
			unwrap(
				client.api['business-analytics'].outcomes.get({
					query: {
						agentId: options.agentId,
						limit: options.limit?.toString(),
						offset: options.offset?.toString(),
					} as any,
				}),
			),
		enabled: !!options.agentId,
	})
}

// =============================================================================
// Workflow Hooks
// =============================================================================

export function useWorkflowsQuery() {
	return useQuery({
		queryKey: ['workflows'],
		queryFn: () => unwrap(client.api.workflows.get()),
		enabled: !!getWorkspaceId(),
	})
}

export function useWorkflowQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['workflows', id],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api.workflows({ id: id! }).get()),
		enabled: !!id,
	})
}

export function useCreateWorkflowMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: Record<string, unknown>) => unwrap(client.api.workflows.post(input as any)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workflows'] })
		},
	})
}

export function useUpdateWorkflowMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = input
			return unwrap(client.api.workflows({ id }).patch(body as any))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflows'] })
			queryClient.invalidateQueries({ queryKey: ['workflows', variables.id] })
		},
	})
}

export function useDeleteWorkflowMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string }) => unwrap(client.api.workflows({ id: input.id }).delete()),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflows'] })
			queryClient.invalidateQueries({ queryKey: ['workflows', variables.id] })
		},
	})
}

export function useAddWorkflowNodeMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = input
			return unwrap(client.api.workflows({ id }).nodes.post(body as any))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflows', variables.id] })
		},
	})
}

export function useRemoveWorkflowNodeMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string; nodeId: string }) =>
			unwrap(
				client.api
					.workflows({ id: input.id })
					.nodes({ nodeId: input.nodeId } as any)
					.delete(),
			),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflows', variables.id] })
		},
	})
}

export function useAddWorkflowEdgeMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = input
			return unwrap(client.api.workflows({ id }).edges.post(body as any))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflows', variables.id] })
		},
	})
}

export function useRemoveWorkflowEdgeMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string; edgeId: string }) =>
			unwrap(
				client.api
					.workflows({ id: input.id })
					.edges({ edgeId: input.edgeId } as any)
					.delete(),
			),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflows', variables.id] })
		},
	})
}

export function useExecuteWorkflowMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: string } & Record<string, unknown>) => {
			const { id, ...body } = input
			return unwrap(client.api.workflows({ id }).execute.post(body as any))
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflows', variables.id, 'executions'] })
		},
	})
}

export function useWorkflowExecutionsQuery(workflowId: string | undefined) {
	return useQuery({
		queryKey: ['workflows', workflowId, 'executions'],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api.workflows({ id: workflowId! }).executions.get()),
		enabled: !!workflowId,
	})
}

export function useWorkflowExecutionDetailsQuery(executionId: string | undefined) {
	return useQuery({
		queryKey: ['workflow-executions', executionId],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check
		queryFn: () => unwrap(client.api.workflows.executions({ id: executionId! }).get()),
		enabled: !!executionId,
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
		queryFn: () => unwrap(client.api.activity.post(queryInput as any)),
		enabled: !!workspaceId,
		refetchInterval,
	})
}
