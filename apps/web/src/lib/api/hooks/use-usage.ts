'use client'

import { useQuery } from '@tanstack/react-query'

// Helper to extract error message from API response
function getErrorMessage(error: unknown, fallback: string): string {
	if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
		return error.error
	}
	return fallback
}

// Explicit types matching the API schema
export interface UsageStats {
	totalCalls: number
	totalTokens: number
	inputTokens: number
	outputTokens: number
	totalCost: number
	periodStart: string
	periodEnd: string
}

export interface AgentUsage {
	agentId: string
	agentName: string
	totalCalls: number
	totalTokens: number
	inputTokens: number
	outputTokens: number
}

// API response types
interface UsageApiResponse {
	usage?: {
		totalMessages?: number
		totalTokensIn?: number
		totalTokensOut?: number
		totalCost?: number
	}
	period?: {
		startDate?: string
		endDate?: string
	}
}

interface AgentUsageApiResponse {
	agentId: string
	usage?: {
		totalMessages?: number
		totalTokensIn?: number
		totalTokensOut?: number
	}
}

async function fetchUsage(workspaceId: string): Promise<UsageStats> {
	const response = await fetch(`/api/usage?workspaceId=${workspaceId}`)
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to fetch usage'))
	}
	const data: UsageApiResponse = await response.json()
	// Transform API response to match expected interface
	return {
		totalCalls: data.usage?.totalMessages ?? 0,
		totalTokens: (data.usage?.totalTokensIn ?? 0) + (data.usage?.totalTokensOut ?? 0),
		inputTokens: data.usage?.totalTokensIn ?? 0,
		outputTokens: data.usage?.totalTokensOut ?? 0,
		totalCost: data.usage?.totalCost ?? 0,
		periodStart: data.period?.startDate ?? new Date().toISOString(),
		periodEnd: data.period?.endDate ?? new Date().toISOString(),
	}
}

async function fetchAgentUsage(agentId: string, workspaceId: string): Promise<AgentUsage> {
	const response = await fetch(`/api/usage/agents/${agentId}?workspaceId=${workspaceId}`)
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to fetch agent usage'))
	}
	const data: AgentUsageApiResponse = await response.json()
	return {
		agentId: data.agentId,
		agentName: data.agentId, // API doesn't return name, use ID as fallback
		totalCalls: data.usage?.totalMessages ?? 0,
		totalTokens: (data.usage?.totalTokensIn ?? 0) + (data.usage?.totalTokensOut ?? 0),
		inputTokens: data.usage?.totalTokensIn ?? 0,
		outputTokens: data.usage?.totalTokensOut ?? 0,
	}
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
