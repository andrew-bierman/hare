'use client'

import type { CreateWorkspaceInput } from '@hare/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@hare/api/client'
import type { CreateWorkspaceInput } from '@hare/api'

// Re-export types for convenience
export type { CreateWorkspaceInput, Workspace } from '@hare/api'

export function useWorkspaces() {
	return useQuery({
		queryKey: ['workspaces'],
		queryFn: () => apiClient.workspaces.list(),
	})
}

export function useWorkspace(id: string | undefined) {
	return useQuery({
		queryKey: ['workspaces', id],
		queryFn: () => apiClient.workspaces.get(id!),
		enabled: !!id,
	})
}

export function useCreateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateWorkspaceInput) => apiClient.workspaces.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

export function useUpdateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<CreateWorkspaceInput> }) =>
			apiClient.workspaces.update(id, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
			queryClient.invalidateQueries({ queryKey: ['workspaces', id] })
		},
	})
}

export function useDeleteWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => apiClient.workspaces.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}
