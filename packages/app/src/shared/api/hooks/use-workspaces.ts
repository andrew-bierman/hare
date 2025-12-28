'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateWorkspaceInput, Workspace } from '../types'
import { apiClient } from '../client'
import { workspaceKeys } from './query-keys'

export function useWorkspaces() {
	return useQuery({
		queryKey: workspaceKeys.list(),
		queryFn: () => apiClient.workspaces.list(),
	})
}

export function useWorkspaceById(id: string | undefined) {
	return useQuery({
		queryKey: workspaceKeys.detail(id ?? ''),
		queryFn: () => apiClient.workspaces.get(id!),
		enabled: !!id,
	})
}

export function useCreateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateWorkspaceInput) => apiClient.workspaces.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workspaceKeys.list() })
		},
	})
}

export function useUpdateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<CreateWorkspaceInput> }) =>
			apiClient.workspaces.update(id, data),
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

export function useDeleteWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => apiClient.workspaces.delete(id),
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
