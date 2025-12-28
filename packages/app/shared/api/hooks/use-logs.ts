'use client'

import { useQuery } from '@tanstack/react-query'

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
// API Functions
// =============================================================================

function buildUrl(path: string, params?: Record<string, string | undefined>): string {
	const url = new URL(path, window.location.origin)
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) {
				url.searchParams.set(key, value)
			}
		}
	}
	return url.toString()
}

async function fetchLogs(workspaceId: string, params?: LogsParams): Promise<LogsResponse> {
	const queryParams: Record<string, string | undefined> = {
		workspaceId,
		userId: params?.userId,
		agentId: params?.agentId,
		status: params?.status?.toString(),
		startDate: params?.startDate,
		endDate: params?.endDate,
		limit: params?.limit?.toString(),
		offset: params?.offset?.toString(),
	}

	const response = await fetch(buildUrl('/api/logs', queryParams), {
		method: 'GET',
		credentials: 'include',
	})

	if (!response.ok) {
		throw new Error('Failed to fetch logs')
	}

	return response.json()
}

async function fetchLogStats(workspaceId: string, params?: LogsParams): Promise<LogStats> {
	const queryParams: Record<string, string | undefined> = {
		workspaceId,
		userId: params?.userId,
		agentId: params?.agentId,
		status: params?.status?.toString(),
		startDate: params?.startDate,
		endDate: params?.endDate,
	}

	const response = await fetch(buildUrl('/api/logs/stats', queryParams), {
		method: 'GET',
		credentials: 'include',
	})

	if (!response.ok) {
		throw new Error('Failed to fetch log stats')
	}

	return response.json()
}

// =============================================================================
// Hooks
// =============================================================================

export function useLogsQuery(workspaceId: string | undefined, params?: LogsParams) {
	return useQuery({
		queryKey: ['logs', workspaceId, params],
		queryFn: () => fetchLogs(workspaceId!, params),
		enabled: !!workspaceId,
		staleTime: 1000 * 30, // Cache for 30 seconds
		refetchInterval: 1000 * 60, // Refetch every minute
	})
}

export function useLogStatsQuery(workspaceId: string | undefined, params?: LogsParams) {
	return useQuery({
		queryKey: ['logs', 'stats', workspaceId, params],
		queryFn: () => fetchLogStats(workspaceId!, params),
		enabled: !!workspaceId,
		staleTime: 1000 * 60, // Cache for 1 minute
		refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
	})
}
