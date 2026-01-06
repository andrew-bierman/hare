'use client'

import { useQuery } from '@tanstack/react-query'
import { logs } from '@hare/api-client'

// =============================================================================
// Types
// =============================================================================

export interface RequestLog {
	id: string
	method: string
	path: string
	status: number
	latencyMs: number
	userId: string | null
	workspaceId: string | null
	agentId: string | null
	userAgent: string | null
	ip: string | null
	timestamp: string
	error: string | null
}

export interface LogsParams {
	userId?: string
	agentId?: string
	status?: number
	startDate?: string
	endDate?: string
	limit?: number
	offset?: number
}

export interface LogsResponse {
	logs: RequestLog[]
	total: number
	limit: number
	offset: number
}

export interface LogStats {
	totalRequests: number
	avgLatencyMs: number
	errorRate: number
	requestsByStatus: Record<string, number>
	requestsByDay: Array<{
		date: string
		requests: number
		avgLatency: number
		errors: number
	}>
}

// =============================================================================
// Hooks
// =============================================================================

export function useLogsQuery(workspaceId: string | undefined, params?: LogsParams) {
	return useQuery({
		queryKey: ['logs', workspaceId, params],
		queryFn: async () => {
			const res = await logs.index.$get({
				query: {
					workspaceId: workspaceId!,
					userId: params?.userId,
					agentId: params?.agentId,
					status: params?.status?.toString(),
					startDate: params?.startDate,
					endDate: params?.endDate,
					limit: params?.limit?.toString(),
					offset: params?.offset?.toString(),
				},
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		enabled: !!workspaceId,
		staleTime: 1000 * 30, // Cache for 30 seconds
		refetchInterval: 1000 * 60, // Refetch every minute
	})
}

export function useLogStatsQuery(workspaceId: string | undefined, params?: LogsParams) {
	return useQuery({
		queryKey: ['logs', 'stats', workspaceId, params],
		queryFn: async () => {
			const res = await logs.stats.$get({
				query: {
					workspaceId: workspaceId!,
					userId: params?.userId,
					agentId: params?.agentId,
					status: params?.status?.toString(),
					startDate: params?.startDate,
					endDate: params?.endDate,
				},
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		enabled: !!workspaceId,
		staleTime: 1000 * 60, // Cache for 1 minute
		refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
	})
}
