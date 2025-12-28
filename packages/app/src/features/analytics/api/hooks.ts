'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient, type AnalyticsParams, type UsageParams } from '@shared/api'

// Types are available from @shared/api, don't re-export to avoid duplicates

export function useAnalytics(workspaceId: string | undefined, params?: AnalyticsParams) {
	return useQuery({
		queryKey: ['analytics', workspaceId, params],
		queryFn: () => apiClient.analytics.get(workspaceId!, params),
		enabled: !!workspaceId,
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes
	})
}

export function useUsage(workspaceId: string | undefined, params?: UsageParams) {
	return useQuery({
		queryKey: ['usage', workspaceId, params],
		queryFn: () => apiClient.usage.getSummary(workspaceId!, params),
		enabled: !!workspaceId,
	})
}

export function useUsageByAgent(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'by-agent', workspaceId],
		queryFn: () => apiClient.usage.getByAgent(workspaceId!),
		enabled: !!workspaceId,
	})
}

export function useAgentUsage(agentId: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'agent', agentId, workspaceId],
		queryFn: () => apiClient.usage.getSummary(workspaceId!, { agentId }),
		enabled: !!agentId && !!workspaceId,
	})
}
