'use client'

import type { AnalyticsParams } from '@hare/api/client'
import { apiClient } from '@hare/api/client'
import { useQuery } from '@tanstack/react-query'
import { analyticsKeys } from 'web-app/lib/tanstack/query-keys'

// Re-export types for convenience
export type { AnalyticsData, AnalyticsParams } from '@hare/api/client'

export function useAnalyticsQuery(workspaceId: string | undefined, params?: AnalyticsParams) {
	return useQuery({
		queryKey: analyticsKeys.overview(workspaceId ?? '', params?.startDate),
		queryFn: () => apiClient.analytics.get(workspaceId!, params),
		enabled: !!workspaceId,
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes
	})
}
