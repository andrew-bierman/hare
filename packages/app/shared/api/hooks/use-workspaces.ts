'use client'

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateWorkspaceInput, Workspace } from '@hare/types'
import { api, ApiClientError } from '../client'
import { workspaceKeys } from './query-keys'

/**
 * Helper to handle Hono RPC response with proper error handling.
 */
async function handleResponse<T>(res: Response & { json(): Promise<T> }): Promise<T> {
	if (!res.ok) {
		let errorMessage = `Request failed with status ${res.status}`
		let errorCode: string | undefined
		try {
			const error = (await res.json()) as { error: string; code?: string }
			errorMessage = error.error ?? errorMessage
			errorCode = error.code
		} catch {
			// Response wasn't JSON
		}
		throw new ApiClientError(errorMessage, res.status, errorCode)
	}
	return res.json()
}

/**
 * Query options for listing all workspaces.
 */
export const workspacesQueryOptions = () =>
	queryOptions({
		queryKey: workspaceKeys.list(),
		queryFn: async () => {
			const res = await api.workspaces.$get()
			return handleResponse(res)
		},
	})

/**
 * Query options for fetching a single workspace.
 */
export const workspaceQueryOptions = (id: string) =>
	queryOptions({
		queryKey: workspaceKeys.detail(id),
		queryFn: async () => {
			const res = await api.workspaces[':id'].$get({ param: { id } })
			return handleResponse(res)
		},
	})

export function useWorkspacesQuery() {
	return useQuery(workspacesQueryOptions())
}

export function useWorkspaceByIdQuery(id: string | undefined) {
	return useQuery({
		...workspaceQueryOptions(id!),
		enabled: !!id,
	})
}

export function useCreateWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: CreateWorkspaceInput) => {
			const res = await api.workspaces.$post({ json: data })
			return handleResponse(res)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workspaceKeys.list() })
		},
	})
}

export function useEnsureDefaultWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async () => {
			const res = await api.workspaces['ensure-default'].$post()
			return handleResponse(res)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workspaceKeys.list() })
		},
	})
}

export function useUpdateWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<CreateWorkspaceInput> }) => {
			const res = await api.workspaces[':id'].$patch({ param: { id }, json: data })
			return handleResponse(res)
		},
		// Optimistic update
		onMutate: async ({ id, data }) => {
			await queryClient.cancelQueries({ queryKey: workspaceKeys.detail(id) })
			const previousWorkspace = queryClient.getQueryData<Workspace>(workspaceKeys.detail(id))
			if (previousWorkspace) {
				queryClient.setQueryData<Workspace>(workspaceKeys.detail(id), {
					...previousWorkspace,
					...data,
				})
			}
			return { previousWorkspace }
		},
		onError: (_err, { id }, context) => {
			if (context?.previousWorkspace) {
				queryClient.setQueryData(workspaceKeys.detail(id), context.previousWorkspace)
			}
		},
		onSettled: (_, _err, { id }) => {
			queryClient.invalidateQueries({ queryKey: workspaceKeys.list() })
			queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(id) })
		},
	})
}

export function useDeleteWorkspaceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api.workspaces[':id'].$delete({ param: { id } })
			return handleResponse(res)
		},
		// Optimistic update
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: workspaceKeys.list() })
			const previousWorkspaces = queryClient.getQueryData<{ workspaces: Workspace[] }>(
				workspaceKeys.list(),
			)
			if (previousWorkspaces) {
				queryClient.setQueryData<{ workspaces: Workspace[] }>(workspaceKeys.list(), {
					workspaces: previousWorkspaces.workspaces.filter((ws) => ws.id !== id),
				})
			}
			return { previousWorkspaces }
		},
		onError: (_err, _id, context) => {
			if (context?.previousWorkspaces) {
				queryClient.setQueryData(workspaceKeys.list(), context.previousWorkspaces)
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: workspaceKeys.list() })
		},
	})
}
