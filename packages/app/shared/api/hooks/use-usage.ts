'use client'

import { useQuery } from '@tanstack/react-query'
import { api, handleResponse } from '../client'

export interface UsageParams {
	startDate?: string
	endDate?: string
	agentId?: string
}

export function useUsageQuery(workspaceId: string | undefined, params?: UsageParams) {
	return useQuery({
		queryKey: ['usage', workspaceId, params],
		queryFn: async () => {
			const res = await api.usage.$get({
				query: {
					workspaceId: workspaceId!,
					startDate: params?.startDate,
					endDate: params?.endDate,
					agentId: params?.agentId,
				},
			})
			return handleResponse(res)
		},
		enabled: !!workspaceId,
	})
}

export function useUsageByAgentQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'by-agent', workspaceId],
		queryFn: async () => {
			const res = await api.usage['by-agent'].$get({
				query: { workspaceId: workspaceId! },
			})
			return handleResponse(res)
		},
		enabled: !!workspaceId,
	})
}

/** Get usage stats for a specific agent */
export function useAgentUsageQuery(agentId: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'agent', agentId, workspaceId],
		queryFn: async () => {
			const res = await api.usage.$get({
				query: {
					workspaceId: workspaceId!,
					agentId,
				},
			})
			return handleResponse(res)
		},
		enabled: !!agentId && !!workspaceId,
	})
}
