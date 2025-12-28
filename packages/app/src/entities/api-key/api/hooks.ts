'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, type CreateApiKeyInput, type UpdateApiKeyInput } from '../../../shared/api'

// Re-export types for convenience
export type { ApiKey, ApiKeyWithSecret, CreateApiKeyInput, UpdateApiKeyInput } from '../../../shared/api'

/**
 * Fetch all API keys for a workspace.
 */
export function useApiKeys(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['api-keys', workspaceId],
		queryFn: () => apiClient.apiKeys.list(workspaceId!),
		enabled: !!workspaceId,
	})
}

/**
 * Fetch a single API key by ID.
 */
export function useApiKey(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['api-keys', workspaceId, id],
		queryFn: () => apiClient.apiKeys.get(id!, workspaceId!),
		enabled: !!id && !!workspaceId,
	})
}

/**
 * Create a new API key.
 * Returns the full key value only on creation - make sure to show it to the user!
 */
export function useCreateApiKey(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateApiKeyInput) => apiClient.apiKeys.create(workspaceId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['api-keys', workspaceId] })
		},
	})
}

/**
 * Update an existing API key.
 */
export function useUpdateApiKey(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateApiKeyInput }) =>
			apiClient.apiKeys.update(id, workspaceId!, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['api-keys', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['api-keys', workspaceId, id] })
		},
	})
}

/**
 * Delete/revoke an API key.
 */
export function useDeleteApiKey(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => apiClient.apiKeys.delete(id, workspaceId!),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['api-keys', workspaceId] })
		},
	})
}
