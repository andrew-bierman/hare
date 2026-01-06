/**
 * oRPC React Query Hooks
 *
 * Type-safe hooks using oRPC client with TanStack Query.
 * Types are fully inferred from the server - no manual annotations needed!
 */

'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@hare/api-client/orpc'

// =============================================================================
// Agent Hooks
// =============================================================================

export function useAgents() {
	return useQuery({
		queryKey: ['agents'],
		queryFn: () => orpc.agents.list({}),
	})
}

export function useAgent(id: string | undefined) {
	return useQuery({
		queryKey: ['agents', id],
		queryFn: () => orpc.agents.get({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.agents.create,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
		},
	})
}

export function useUpdateAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.agents.update,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id] })
		},
	})
}

export function useDeleteAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.agents.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
		},
	})
}

export function useDeployAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.agents.deploy,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id] })
		},
	})
}

export function useUndeployAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.agents.undeploy,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['agents'] })
			queryClient.invalidateQueries({ queryKey: ['agents', variables.id] })
		},
	})
}

// =============================================================================
// Tool Hooks
// =============================================================================

export function useTools() {
	return useQuery({
		queryKey: ['tools'],
		queryFn: () => orpc.tools.list({}),
	})
}

export function useTool(id: string | undefined) {
	return useQuery({
		queryKey: ['tools', id],
		queryFn: () => orpc.tools.get({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateTool() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.tools.create,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools'] })
		},
	})
}

export function useUpdateTool() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.tools.update,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['tools'] })
			queryClient.invalidateQueries({ queryKey: ['tools', variables.id] })
		},
	})
}

export function useDeleteTool() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.tools.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools'] })
		},
	})
}

export function useTestTool() {
	return useMutation({
		mutationFn: orpc.tools.test,
	})
}

export function useTestExistingTool() {
	return useMutation({
		mutationFn: orpc.tools.testExisting,
	})
}

// =============================================================================
// API Key Hooks
// =============================================================================

export function useApiKeys() {
	return useQuery({
		queryKey: ['api-keys'],
		queryFn: () => orpc.apiKeys.list({}),
	})
}

export function useApiKey(id: string | undefined) {
	return useQuery({
		queryKey: ['api-keys', id],
		queryFn: () => orpc.apiKeys.get({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateApiKey() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.apiKeys.create,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] })
		},
	})
}

export function useUpdateApiKey() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.apiKeys.update,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] })
			queryClient.invalidateQueries({ queryKey: ['api-keys', variables.id] })
		},
	})
}

export function useDeleteApiKey() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.apiKeys.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] })
		},
	})
}

// =============================================================================
// Workspace Hooks
// =============================================================================

export function useWorkspaces() {
	return useQuery({
		queryKey: ['workspaces'],
		queryFn: () => orpc.workspaces.list({}),
	})
}

export function useCurrentWorkspace() {
	return useQuery({
		queryKey: ['workspaces', 'current'],
		queryFn: () => orpc.workspaces.getCurrent({}),
	})
}

export function useWorkspace(id: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', id],
		queryFn: () => orpc.workspaces.get({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.workspaces.create,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

export function useUpdateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.workspaces.update,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id] })
		},
	})
}

export function useDeleteWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.workspaces.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

// =============================================================================
// Schedule Hooks
// =============================================================================

export function useSchedules(agentId?: string) {
	return useQuery({
		queryKey: ['schedules', { agentId }],
		queryFn: () => orpc.schedules.list({ agentId }),
	})
}

export function useSchedule(id: string | undefined) {
	return useQuery({
		queryKey: ['schedules', id],
		queryFn: () => orpc.schedules.get({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateSchedule() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.schedules.create,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
		},
	})
}

export function useUpdateSchedule() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.schedules.update,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function useDeleteSchedule() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.schedules.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
		},
	})
}

export function usePauseSchedule() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.schedules.pause,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function useResumeSchedule() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.schedules.resume,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules'] })
			queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] })
		},
	})
}

export function useScheduleExecutions(scheduleId: string | undefined) {
	return useQuery({
		queryKey: ['schedules', scheduleId, 'executions'],
		queryFn: () => orpc.schedules.getExecutions({ id: scheduleId! }),
		enabled: !!scheduleId,
	})
}

// =============================================================================
// Workspace Members Hooks
// =============================================================================

export function useWorkspaceMembers(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'members'],
		queryFn: () => orpc.workspaceMembers.listMembers({ id: workspaceId! }),
		enabled: !!workspaceId,
	})
}

export function useWorkspaceInvitations(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', workspaceId, 'invitations'],
		queryFn: () => orpc.workspaceMembers.listInvitations({ id: workspaceId! }),
		enabled: !!workspaceId,
	})
}

export function useSendInvitation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.workspaceMembers.sendInvitation,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'invitations'] })
		},
	})
}

export function useRevokeInvitation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.workspaceMembers.revokeInvitation,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'invitations'] })
		},
	})
}

export function useRemoveMember() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.workspaceMembers.removeMember,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'members'] })
		},
	})
}

export function useUpdateMemberRole() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.workspaceMembers.updateMemberRole,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id, 'members'] })
		},
	})
}

// =============================================================================
// User Settings Hooks
// =============================================================================

export function useUserPreferences() {
	return useQuery({
		queryKey: ['user', 'preferences'],
		queryFn: () => orpc.userSettings.get({}),
	})
}

export function useUpdateUserPreferences() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: orpc.userSettings.update,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['user', 'preferences'] })
		},
	})
}

// =============================================================================
// Usage Hooks
// =============================================================================

export function useWorkspaceUsage(options?: { startDate?: string; endDate?: string }) {
	return useQuery({
		queryKey: ['usage', options],
		queryFn: () => orpc.usage.getWorkspaceUsage(options || {}),
	})
}

export function useAgentUsage(agentId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'agents', agentId],
		queryFn: () => orpc.usage.getAgentUsage({ id: agentId! }),
		enabled: !!agentId,
	})
}

// =============================================================================
// Analytics Hooks
// =============================================================================

export function useAnalytics(options?: {
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

export function useLogs(options?: {
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

export function useLogStats(options?: {
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
