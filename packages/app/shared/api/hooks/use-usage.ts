'use client'

import { useQuery } from '@tanstack/react-query'
import { usage } from '@hare/api-client'

export interface UsageParams {
	startDate?: string
	endDate?: string
	agentId?: string
}

export function useUsageQuery(workspaceId: string | undefined, params?: UsageParams) {
	return useQuery({
		queryKey: ['usage', workspaceId, params],
		queryFn: async () => {
			const res = await usage.index.$get({
				query: {
					workspaceId: workspaceId!,
					startDate: params?.startDate,
					endDate: params?.endDate,
					agentId: params?.agentId,
				},
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		enabled: !!workspaceId,
	})
}

/** Get usage stats for a specific agent */
export function useAgentUsageQuery(agentId: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'agent', agentId, workspaceId],
		queryFn: async () => {
			const res = await usage.agents[':id'].$get({
				param: { id: agentId! },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		enabled: !!agentId && !!workspaceId,
	})
}
