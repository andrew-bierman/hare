'use client'

/**
 * Stub hooks for Tauri app
 *
 * These hooks return empty data since the Tauri app doesn't have
 * API connectivity yet. They're needed to satisfy the component props.
 */

import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'

// Type definitions matching the shared API types
interface Agent {
	id: string
	workspaceId: string
	name: string
	description: string | null
	model: string
	instructions: string
	config: Record<string, unknown> | null
	status: 'draft' | 'deployed' | 'archived'
	toolIds: string[]
	createdAt: string
	updatedAt: string
}

interface Tool {
	id: string
	workspaceId: string
	name: string
	description: string
	type: 'http' | 'sql' | 'kv' | 'r2' | 'custom'
	isSystem: boolean
	inputSchema: Record<string, unknown>
	config: Record<string, unknown> | null
	createdAt: string
	updatedAt: string
}

interface UsageData {
	totalCalls: number
	totalTokens: number
	inputTokens: number
	outputTokens: number
}

/**
 * Stub hook for agents - returns empty array
 */
export function useAgents(
	_workspaceId: string | undefined,
): UseQueryResult<{ agents: Agent[] }, Error> {
	return useQuery({
		queryKey: ['agents', 'stub'],
		queryFn: async () => ({ agents: [] }),
		enabled: false, // Never actually fetch
	})
}

/**
 * Stub hook for tools - returns empty array
 */
export function useTools(
	_workspaceId: string | undefined,
): UseQueryResult<{ tools: Tool[] }, Error> {
	return useQuery({
		queryKey: ['tools', 'stub'],
		queryFn: async () => ({ tools: [] }),
		enabled: false,
	})
}

/**
 * Stub hook for usage - returns zero values
 */
export function useUsage(_workspaceId: string | undefined): UseQueryResult<UsageData, Error> {
	return useQuery({
		queryKey: ['usage', 'stub'],
		queryFn: async () => ({
			totalCalls: 0,
			totalTokens: 0,
			inputTokens: 0,
			outputTokens: 0,
		}),
		enabled: false,
	})
}
