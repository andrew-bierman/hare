'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, type ExecutionHistoryParams, type ScheduleListParams } from '../client'
import type { CreateScheduleInput, UpdateScheduleInput } from '../types'

// Re-export types for convenience
export type {
	CreateScheduleInput,
	Schedule,
	ScheduleExecution,
	ScheduleStatus,
	ScheduleType,
	UpdateScheduleInput,
} from '../types'

/**
 * Hook to list schedules for an agent
 */
export function useSchedules(
	agentId: string | undefined,
	workspaceId: string | undefined,
	params?: ScheduleListParams,
) {
	return useQuery({
		queryKey: ['schedules', workspaceId, agentId, params?.status],
		queryFn: () => apiClient.schedules.list(agentId!, workspaceId!, params),
		enabled: !!agentId && !!workspaceId,
	})
}

/**
 * Hook to get a single schedule
 */
export function useSchedule(
	agentId: string | undefined,
	scheduleId: string | undefined,
	workspaceId: string | undefined,
) {
	return useQuery({
		queryKey: ['schedules', workspaceId, agentId, scheduleId],
		queryFn: () => apiClient.schedules.get(agentId!, scheduleId!, workspaceId!),
		enabled: !!agentId && !!scheduleId && !!workspaceId,
	})
}

/**
 * Hook to create a schedule
 */
export function useCreateSchedule(agentId: string | undefined, workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateScheduleInput) =>
			apiClient.schedules.create(agentId!, workspaceId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['schedules', workspaceId, agentId] })
		},
	})
}

/**
 * Hook to update a schedule
 */
export function useUpdateSchedule(agentId: string | undefined, workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ scheduleId, data }: { scheduleId: string; data: UpdateScheduleInput }) =>
			apiClient.schedules.update(agentId!, scheduleId, workspaceId!, data),
		onSuccess: (_, { scheduleId }) => {
			queryClient.invalidateQueries({ queryKey: ['schedules', workspaceId, agentId] })
			queryClient.invalidateQueries({ queryKey: ['schedules', workspaceId, agentId, scheduleId] })
		},
	})
}

/**
 * Hook to delete a schedule
 */
export function useDeleteSchedule(agentId: string | undefined, workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (scheduleId: string) =>
			apiClient.schedules.delete(agentId!, scheduleId, workspaceId!),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['schedules', workspaceId, agentId] })
		},
	})
}

/**
 * Hook to get execution history for a schedule
 */
export function useScheduleExecutions(
	agentId: string | undefined,
	scheduleId: string | undefined,
	workspaceId: string | undefined,
	params?: ExecutionHistoryParams,
) {
	return useQuery({
		queryKey: ['executions', workspaceId, agentId, scheduleId, params?.limit, params?.offset],
		queryFn: () => apiClient.schedules.getExecutions(agentId!, scheduleId!, workspaceId!, params),
		enabled: !!agentId && !!scheduleId && !!workspaceId,
	})
}

/**
 * Hook to get all executions for an agent
 */
export function useAgentExecutions(
	agentId: string | undefined,
	workspaceId: string | undefined,
	params?: ExecutionHistoryParams,
) {
	return useQuery({
		queryKey: ['executions', workspaceId, agentId, 'all', params?.limit, params?.offset],
		queryFn: () => apiClient.schedules.getAgentExecutions(agentId!, workspaceId!, params),
		enabled: !!agentId && !!workspaceId,
	})
}
