'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Helper to extract error message from API response
function getErrorMessage(error: unknown, fallback: string): string {
	if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
		return error.error
	}
	return fallback
}

// Explicit types matching the API schema
export interface Workspace {
	id: string
	name: string
	description: string | null
	role: 'owner' | 'admin' | 'member' | 'viewer'
	slug?: string
	createdAt: string
	updatedAt: string
}

export interface CreateWorkspaceInput {
	name: string
	description?: string
	slug?: string
}

export interface UpdateWorkspaceInput {
	name?: string
	description?: string
}

async function fetchWorkspaces(): Promise<{ workspaces: Workspace[] }> {
	const response = await fetch('/api/workspaces')
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to fetch workspaces'))
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
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to create workspace'))
	}
	return response.json()
}

async function updateWorkspace(id: string, data: UpdateWorkspaceInput): Promise<Workspace> {
	const response = await fetch(`/api/workspaces/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	})
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to update workspace'))
	}
	return response.json()
}

async function deleteWorkspace(id: string): Promise<void> {
	const response = await fetch(`/api/workspaces/${id}`, {
		method: 'DELETE',
	})
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to delete workspace'))
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
		mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceInput }) =>
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
