'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@hare/api-client'
import { analyticsKeys } from './query-keys'

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
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		enabled: !!workspaceId,
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes
	})
}
