'use client'

import { useQuery } from '@tanstack/react-query'
import type { AnalyticsParams } from '../client'
import { apiClient } from '../client'
import { analyticsKeys } from './query-keys'

export function useAnalyticsQuery(workspaceId: string | undefined, params?: AnalyticsParams) {
	return useQuery({
		queryKey: analyticsKeys.overview(workspaceId ?? '', params?.startDate),
		queryFn: () => apiClient.analytics.get(workspaceId!, params),
		enabled: !!workspaceId,
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes
	})
}
