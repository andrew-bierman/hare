'use client'

import type { CreateScheduleInput, UpdateScheduleInput } from '@hare/api'
import { apiClient, type ExecutionHistoryParams, type ScheduleListParams } from '@hare/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Re-export types for convenience
export type {
	CreateScheduleInput,
	Schedule,
	ScheduleExecution,
	ScheduleStatus,
	ScheduleType,
	UpdateScheduleInput,
} from '@hare/api'

/**
 * Input for useSchedules hook.
 */
export interface UseSchedulesInput {
	agentId: string | undefined
	workspaceId: string | undefined
	params?: ScheduleListParams
}

/**
 * Hook to list schedules for an agent
 */
export function useSchedulesQuery(input: UseSchedulesInput) {
	const { agentId, workspaceId, params } = input
	return useQuery({
		queryKey: ['schedules', workspaceId, agentId, params?.status],
		queryFn: () => apiClient.schedules.list(agentId!, workspaceId!, params),
		enabled: !!agentId && !!workspaceId,
	})
}

/**
 * Input for useSchedule hook.
 */
export interface UseScheduleInput {
	agentId: string | undefined
	scheduleId: string | undefined
	workspaceId: string | undefined
}

/**
 * Hook to get a single schedule
 */
export function useScheduleQuery(input: UseScheduleInput) {
	const { agentId, scheduleId, workspaceId } = input
	return useQuery({
		queryKey: ['schedules', workspaceId, agentId, scheduleId],
		queryFn: () => apiClient.schedules.get(agentId!, scheduleId!, workspaceId!),
		enabled: !!agentId && !!scheduleId && !!workspaceId,
	})
}

/**
 * Hook to create a schedule
 */
export function useCreateScheduleMutation(
	agentId: string | undefined,
	workspaceId: string | undefined,
) {
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
export function useUpdateScheduleMutation(
	agentId: string | undefined,
	workspaceId: string | undefined,
) {
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
export function useDeleteScheduleMutation(
	agentId: string | undefined,
	workspaceId: string | undefined,
) {
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
 * Input for useScheduleExecutions hook.
 */
export interface UseScheduleExecutionsInput {
	agentId: string | undefined
	scheduleId: string | undefined
	workspaceId: string | undefined
	params?: ExecutionHistoryParams
}

/**
 * Hook to get execution history for a schedule
 */
export function useScheduleExecutionsQuery(input: UseScheduleExecutionsInput) {
	const { agentId, scheduleId, workspaceId, params } = input
	return useQuery({
		queryKey: ['executions', workspaceId, agentId, scheduleId, params?.limit, params?.offset],
		queryFn: () => apiClient.schedules.getExecutions(agentId!, scheduleId!, workspaceId!, params),
		enabled: !!agentId && !!scheduleId && !!workspaceId,
	})
}

/**
 * Input for useAgentExecutions hook.
 */
export interface UseAgentExecutionsInput {
	agentId: string | undefined
	workspaceId: string | undefined
	params?: ExecutionHistoryParams
}

/**
 * Hook to get all executions for an agent
 */
export function useAgentExecutionsQuery(input: UseAgentExecutionsInput) {
	const { agentId, workspaceId, params } = input
	return useQuery({
		queryKey: ['executions', workspaceId, agentId, 'all', params?.limit, params?.offset],
		queryFn: () => apiClient.schedules.getAgentExecutions(agentId!, workspaceId!, params),
		enabled: !!agentId && !!workspaceId,
	})
}
