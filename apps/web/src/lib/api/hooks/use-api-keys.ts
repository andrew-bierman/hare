'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	apiKeys,
	type ApiKey,
	type CreateApiKeyInput,
	type UpdateApiKeyInput,
} from '@hare/api/client'
import { apiKeyKeys } from 'web-app/lib/tanstack/query-keys'

// Re-export types for convenience
export type {
	ApiKey,
	ApiKeyWithSecret,
	CreateApiKeyInput,
	UpdateApiKeyInput,
} from '@hare/api/client'

/**
 * Fetch all API keys for a workspace.
 */
export function useApiKeys(workspaceId: string | undefined) {
	return useQuery({
		queryKey: apiKeyKeys.list(workspaceId ?? ''),
		queryFn: () => apiKeys.list(workspaceId!),
		enabled: !!workspaceId,
	})
}

/**
 * Fetch a single API key by ID.
 */
export function useApiKey(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: apiKeyKeys.detail(workspaceId ?? '', id ?? ''),
		queryFn: () => apiKeys.get(id!, workspaceId!),
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
		mutationFn: (data: CreateApiKeyInput) => apiKeys.create(workspaceId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: apiKeyKeys.list(workspaceId ?? '') })
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
			apiKeys.update(id, workspaceId!, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: apiKeyKeys.list(workspaceId ?? '') })
			queryClient.invalidateQueries({ queryKey: apiKeyKeys.detail(workspaceId ?? '', id) })
		},
	})
}

/**
 * Delete/revoke an API key.
 */
export function useDeleteApiKey(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => apiKeys.delete(id, workspaceId!),
		// Optimistic update
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: apiKeyKeys.list(workspaceId ?? '') })
			const previousKeys = queryClient.getQueryData<{ apiKeys: ApiKey[] }>(
				apiKeyKeys.list(workspaceId ?? ''),
			)
			if (previousKeys) {
				queryClient.setQueryData<{ apiKeys: ApiKey[] }>(apiKeyKeys.list(workspaceId ?? ''), {
					apiKeys: previousKeys.apiKeys.filter((key) => key.id !== id),
				})
			}
			return { previousKeys }
		},
		onError: (_err, _id, context) => {
			if (context?.previousKeys) {
				queryClient.setQueryData(apiKeyKeys.list(workspaceId ?? ''), context.previousKeys)
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: apiKeyKeys.list(workspaceId ?? '') })
		},
	})
}
