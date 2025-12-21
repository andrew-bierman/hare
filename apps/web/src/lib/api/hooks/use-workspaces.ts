'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface Workspace {
	id: string
	name: string
	slug: string
	ownerId: string
	createdAt: string
	updatedAt: string
}

export interface CreateWorkspaceInput {
	name: string
	slug?: string
}

async function fetchWorkspaces(): Promise<{ workspaces: Workspace[] }> {
	const response = await fetch('/api/workspaces')
	if (!response.ok) {
		throw new Error('Failed to fetch workspaces')
	}
	return response.json()
}

async function createWorkspace(data: CreateWorkspaceInput): Promise<Workspace> {
	const response = await fetch('/api/workspaces', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	})
	if (!response.ok) {
		const error = await response.json()
		throw new Error(error.error || 'Failed to create workspace')
	}
	return response.json()
}

async function updateWorkspace(id: string, data: Partial<CreateWorkspaceInput>): Promise<Workspace> {
	const response = await fetch(`/api/workspaces/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	})
	if (!response.ok) {
		const error = await response.json()
		throw new Error(error.error || 'Failed to update workspace')
	}
	return response.json()
}

async function deleteWorkspace(id: string): Promise<void> {
	const response = await fetch(`/api/workspaces/${id}`, {
		method: 'DELETE',
	})
	if (!response.ok) {
		const error = await response.json()
		throw new Error(error.error || 'Failed to delete workspace')
	}
}

export function useWorkspaces() {
	return useQuery({
		queryKey: ['workspaces'],
		queryFn: fetchWorkspaces,
	})
}

export function useCreateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: createWorkspace,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

export function useUpdateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<CreateWorkspaceInput> }) =>
			updateWorkspace(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

export function useDeleteWorkspace() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: deleteWorkspace,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}
