/**
 * Stub hooks for Tauri desktop app
 *
 * These hooks provide TanStack Query-compatible results using initialData
 * to avoid making API calls while still providing the expected hook interface.
 *
 * The desktop app runs locally and may not have access to the remote API,
 * so these stubs return mock data until proper local storage/API is implemented.
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import type {
	Agent,
	Tool,
	Workspace,
	CreateWorkspaceInput,
} from '@hare/app/shared/api'

/** Default workspace for desktop app */
const DEFAULT_WORKSPACE: Workspace = {
	id: 'tauri-workspace',
	name: 'Desktop Workspace',
	slug: 'desktop',
	description: null,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
}

/**
 * Stub hook for agents query
 * Returns an empty agents list with proper TanStack Query result shape
 */
export function useAgents(
	_workspaceId: string | undefined,
): UseQueryResult<{ agents: Agent[] }, Error> {
	return useQuery({
		queryKey: ['agents', _workspaceId],
		queryFn: () => Promise.resolve({ agents: [] }),
		initialData: { agents: [] },
	})
}

/**
 * Stub hook for tools query
 * Returns an empty tools list with proper TanStack Query result shape
 */
export function useTools(
	_workspaceId: string | undefined,
): UseQueryResult<{ tools: Tool[] }, Error> {
	return useQuery({
		queryKey: ['tools', _workspaceId],
		queryFn: () => Promise.resolve({ tools: [] }),
		initialData: { tools: [] },
	})
}

/** Usage data structure for dashboard */
export interface UsageData {
	totalCalls: number
	totalTokens: number
	inputTokens: number
	outputTokens: number
}

/**
 * Stub hook for usage query
 * Returns zeroed usage stats with proper TanStack Query result shape
 */
export function useUsage(
	_workspaceId: string | undefined,
): UseQueryResult<UsageData, Error> {
	return useQuery({
		queryKey: ['usage', _workspaceId],
		queryFn: () =>
			Promise.resolve({
				totalCalls: 0,
				totalTokens: 0,
				inputTokens: 0,
				outputTokens: 0,
			}),
		initialData: {
			totalCalls: 0,
			totalTokens: 0,
			inputTokens: 0,
			outputTokens: 0,
		},
	})
}

/**
 * Stub hook for workspaces query
 * Returns a default workspace for the desktop app
 */
export function useWorkspacesQuery(): UseQueryResult<{ workspaces: Workspace[] }, Error> {
	return useQuery({
		queryKey: ['workspaces'],
		queryFn: () => Promise.resolve({ workspaces: [DEFAULT_WORKSPACE] }),
		initialData: { workspaces: [DEFAULT_WORKSPACE] },
	})
}

/**
 * Stub mutation for creating workspaces
 * In desktop app, just returns the input as a new workspace
 */
export function useCreateWorkspaceMutation(): UseMutationResult<
	Workspace,
	Error,
	CreateWorkspaceInput
> {
	return useMutation({
		mutationFn: async (input: CreateWorkspaceInput) => {
			// In desktop app, just create a local workspace object
			const workspace: Workspace = {
				id: `workspace-${Date.now()}`,
				name: input.name,
				slug: input.slug,
				description: input.description ?? null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			}
			return workspace
		},
	})
}
