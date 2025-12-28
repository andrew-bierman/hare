'use client'

import { useQuery } from '@tanstack/react-query'
import type { AnalyticsParams } from '@hare/api/client'
import { apiClient } from '@hare/api/client'

// Re-export types for convenience
export type { AnalyticsData, AnalyticsParams } from '@hare/api/client'

export function useAnalytics(workspaceId: string | undefined, params?: AnalyticsParams) {
	return useQuery({
		queryKey: ['analytics', workspaceId, params],
		queryFn: () => apiClient.analytics.get(workspaceId!, params),
		enabled: !!workspaceId,
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes
	})
}
