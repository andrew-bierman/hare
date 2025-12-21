'use client'

import { useQuery } from '@tanstack/react-query'

export interface UsageStats {
	totalCalls: number
	totalTokens: number
	inputTokens: number
	outputTokens: number
	totalCost: number
	periodStart: string
	periodEnd: string
}

export interface UsageRecord {
	id: string
	agentId: string | null
	type: string
	inputTokens: number
	outputTokens: number
	totalTokens: number
	cost: number | null
	createdAt: string
}

export interface AgentUsage {
	agentId: string
	agentName: string
	totalCalls: number
	totalTokens: number
	inputTokens: number
	outputTokens: number
}

async function fetchUsage(workspaceId: string): Promise<UsageStats> {
	const response = await fetch(`/api/usage?workspaceId=${workspaceId}`)
	if (!response.ok) {
		throw new Error('Failed to fetch usage')
	}
	return response.json()
}

async function fetchAgentUsage(agentId: string, workspaceId: string): Promise<AgentUsage> {
	const response = await fetch(`/api/usage/agents/${agentId}?workspaceId=${workspaceId}`)
	if (!response.ok) {
		throw new Error('Failed to fetch agent usage')
	}
	return response.json()
}

export function useUsage(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['usage', workspaceId],
		queryFn: () => fetchUsage(workspaceId!),
		enabled: !!workspaceId,
	})
}

export function useAgentUsage(agentId: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['usage', 'agents', agentId, workspaceId],
		queryFn: () => fetchAgentUsage(agentId!, workspaceId!),
		enabled: !!agentId && !!workspaceId,
	})
}
