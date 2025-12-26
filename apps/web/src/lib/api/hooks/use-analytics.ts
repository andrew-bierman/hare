'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../client'
import type { AnalyticsParams, AnalyticsData } from '../client'

// Re-export types for convenience
export type { AnalyticsParams, AnalyticsData } from '../client'

export function useAnalytics(workspaceId: string | undefined, params?: AnalyticsParams) {
	return useQuery({
		queryKey: ['analytics', workspaceId, params],
		queryFn: () => apiClient.analytics.get(workspaceId!, params),
		enabled: !!workspaceId,
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes
	})
}
