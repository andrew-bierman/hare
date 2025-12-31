'use client'

import type { CreateScheduleInput, UpdateScheduleInput } from '@hare/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@hare/api-client'

export interface ScheduleListParams {
	status?: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled'
}

export interface ExecutionHistoryParams {
	limit?: number
	offset?: number
}

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
		queryFn: async () => {
			const res = await api.agents[':id'].schedules.$get({
				param: { id: agentId! },
				query: { workspaceId: workspaceId!, status: params?.status },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
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
		queryFn: async () => {
			const res = await api.agents[':id'].schedules[':scheduleId'].$get({
				param: { id: agentId!, scheduleId: scheduleId! },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		enabled: !!agentId && !!scheduleId && !!workspaceId,
	})
}

/**
 * Hook to create a schedule
 */
export function useCreateScheduleMutation(agentId: string | undefined, workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: CreateScheduleInput) => {
			const res = await api.agents[':id'].schedules.$post({
				param: { id: agentId! },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['schedules', workspaceId, agentId] })
		},
	})
}

/**
 * Hook to update a schedule
 */
export function useUpdateScheduleMutation(agentId: string | undefined, workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ scheduleId, data }: { scheduleId: string; data: UpdateScheduleInput }) => {
			const res = await api.agents[':id'].schedules[':scheduleId'].$patch({
				param: { id: agentId!, scheduleId },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: (_, { scheduleId }) => {
			queryClient.invalidateQueries({ queryKey: ['schedules', workspaceId, agentId] })
			queryClient.invalidateQueries({ queryKey: ['schedules', workspaceId, agentId, scheduleId] })
		},
	})
}

/**
 * Hook to delete a schedule
 */
export function useDeleteScheduleMutation(agentId: string | undefined, workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (scheduleId: string) => {
			const res = await api.agents[':id'].schedules[':scheduleId'].$delete({
				param: { id: agentId!, scheduleId },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
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
		queryFn: async () => {
			const res = await api.agents[':id'].schedules[':scheduleId'].executions.$get({
				param: { id: agentId!, scheduleId: scheduleId! },
				query: {
					workspaceId: workspaceId!,
					limit: params?.limit?.toString(),
					offset: params?.offset?.toString(),
				},
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
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
		queryFn: async () => {
			const res = await api.agents[':id'].executions.$get({
				param: { id: agentId! },
				query: {
					workspaceId: workspaceId!,
					limit: params?.limit?.toString(),
					offset: params?.offset?.toString(),
				},
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		enabled: !!agentId && !!workspaceId,
	})
}
