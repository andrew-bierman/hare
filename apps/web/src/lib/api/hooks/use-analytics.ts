'use client'

import { useQuery } from '@tanstack/react-query'
import type { AnalyticsData, AnalyticsParams } from '../client'
import { apiClient } from '../client'

// Re-export types for convenience
export type { AnalyticsData, AnalyticsParams } from '../client'

export function useAnalytics(workspaceId: string | undefined, params?: AnalyticsParams) {
	return useQuery({
		queryKey: ['analytics', workspaceId, params],
		queryFn: () => apiClient.analytics.get(workspaceId!, params),
		enabled: !!workspaceId,
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes
	})
}
