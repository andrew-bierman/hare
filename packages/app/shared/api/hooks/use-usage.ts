'use client'

import { useQuery } from '@tanstack/react-query'
import { api, ApiClientError } from '../client'

/**
 * Helper to handle Hono RPC response with proper error handling.
 */
async function handleResponse<T>(res: Response & { json(): Promise<T> }): Promise<T> {
	if (!res.ok) {
		let errorMessage = `Request failed with status ${res.status}`
		let errorCode: string | undefined
		try {
			const error = (await res.json()) as { error: string; code?: string }
			errorMessage = error.error ?? errorMessage
			errorCode = error.code
		} catch {
			// Response wasn't JSON
		}
		throw new ApiClientError(errorMessage, res.status, errorCode)
	}
	return res.json()
}

export interface UsageParams {
	startDate?: string
	endDate?: string
	agentId?: string
}

export function useUsageQuery(workspaceId: string | undefined, params?: UsageParams) {
	return useQuery({
		queryKey: ['usage', workspaceId, params],
		queryFn: async () => {
			const res = await api.usage.$get({
				query: {
					workspaceId: workspaceId!,
					startDate: params?.startDate,
					endDate: params?.endDate,
					agentId: params?.agentId,
				},
			})
			return handleResponse(res)
		},
		enabled: !!workspaceId,
	})
}

export function useUsageByAgentQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'by-agent', workspaceId],
		queryFn: async () => {
			const res = await api.usage['by-agent'].$get({
				query: { workspaceId: workspaceId! },
			})
			return handleResponse(res)
		},
		enabled: !!workspaceId,
	})
}

/** Get usage stats for a specific agent */
export function useAgentUsageQuery(agentId: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'agent', agentId, workspaceId],
		queryFn: async () => {
			const res = await api.usage.$get({
				query: {
					workspaceId: workspaceId!,
					agentId,
				},
			})
			return handleResponse(res)
		},
		enabled: !!agentId && !!workspaceId,
	})
}
