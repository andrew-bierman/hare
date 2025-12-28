'use client'

import { apiClient } from '@hare/api/client'
import { useQuery } from '@tanstack/react-query'

// Re-export types for convenience
export type { AgentUsage, UsageSummary } from '@hare/api'

export interface UsageParams {
	startDate?: string
	endDate?: string
	agentId?: string
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

/** Get usage stats for a specific agent */
export function useAgentUsage(agentId: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'agent', agentId, workspaceId],
		queryFn: () => apiClient.usage.getSummary(workspaceId!, { agentId }),
		enabled: !!agentId && !!workspaceId,
	})
}
