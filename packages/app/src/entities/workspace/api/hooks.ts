'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@shared/api'
import type { CreateWorkspaceInput } from '@shared/api'

// Types are available from @shared/api, don't re-export to avoid duplicates

export function useWorkspaces() {
	return useQuery({
		queryKey: ['workspaces'],
		queryFn: () => apiClient.workspaces.list(),
	})
}

export function useWorkspaceById(id: string | undefined) {
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
