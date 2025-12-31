'use client'

import { useQuery } from '@tanstack/react-query'
import { api, ApiClientError } from '../client'
import { analyticsKeys } from './query-keys'

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

export interface AnalyticsParams {
	startDate?: string
	endDate?: string
	agentId?: string
	groupBy?: 'day' | 'week' | 'month'
}

export function useAnalyticsQuery(workspaceId: string | undefined, params?: AnalyticsParams) {
	return useQuery({
		queryKey: analyticsKeys.overview(workspaceId ?? '', params?.startDate),
		queryFn: async () => {
			const res = await api.analytics.$get({
				query: {
					workspaceId: workspaceId!,
					startDate: params?.startDate,
					endDate: params?.endDate,
					agentId: params?.agentId,
					groupBy: params?.groupBy,
				},
			})
			return handleResponse(res)
		},
		enabled: !!workspaceId,
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes
	})
}
