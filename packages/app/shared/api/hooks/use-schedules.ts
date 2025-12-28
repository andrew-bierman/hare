'use client'

import type { CreateScheduleInput, UpdateScheduleInput } from '../types'
import { apiClient, type ExecutionHistoryParams, type ScheduleListParams } from '../client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
export function useSchedules(input: UseSchedulesInput) {
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
export function useSchedule(input: UseScheduleInput) {
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
export function useScheduleExecutions(input: UseScheduleExecutionsInput) {
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
export function useAgentExecutions(input: UseAgentExecutionsInput) {
	const { agentId, workspaceId, params } = input
	return useQuery({
		queryKey: ['executions', workspaceId, agentId, 'all', params?.limit, params?.offset],
		queryFn: () => apiClient.schedules.getAgentExecutions(agentId!, workspaceId!, params),
		enabled: !!agentId && !!workspaceId,
	})
}
