'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, handleResponse } from '../client'
import { apiKeyKeys } from './query-keys'

// Types for API keys
export interface ApiKey {
	id: string
	workspaceId: string
	name: string
	prefix: string
	permissions: {
		scopes?: string[]
		agentIds?: string[]
	} | null
	lastUsedAt: string | null
	expiresAt: string | null
	createdAt: string
}

export interface ApiKeyWithSecret extends Omit<ApiKey, 'lastUsedAt'> {
	key: string
}

export interface CreateApiKeyInput {
	name: string
	permissions?: {
		scopes?: string[]
		agentIds?: string[]
	}
	expiresAt?: string
}

export interface UpdateApiKeyInput {
	name?: string
	permissions?: {
		scopes?: string[]
		agentIds?: string[]
	} | null
}

/**
 * Fetch all API keys for a workspace.
 */
export function useApiKeysQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: apiKeyKeys.list(workspaceId ?? ''),
		queryFn: async () => {
			const res = await api['api-keys'].$get({ query: { workspaceId: workspaceId! } })
			return handleResponse(res)
		},
		enabled: !!workspaceId,
	})
}

/**
 * Fetch a single API key by ID.
 */
export function useApiKeyQuery(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: apiKeyKeys.detail(workspaceId ?? '', id ?? ''),
		queryFn: async () => {
			const res = await api['api-keys'][':id'].$get({
				param: { id: id! },
				query: { workspaceId: workspaceId! },
			})
			return handleResponse(res)
		},
		enabled: !!id && !!workspaceId,
	})
}

/**
 * Create a new API key.
 * Returns the full key value only on creation - make sure to show it to the user!
 */
export function useCreateApiKeyMutation(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: CreateApiKeyInput) => {
			const res = await api['api-keys'].$post({
				query: { workspaceId: workspaceId! },
				json: data,
			})
			return handleResponse(res)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: apiKeyKeys.list(workspaceId ?? '') })
		},
	})
}

/**
 * Update an existing API key.
 */
export function useUpdateApiKeyMutation(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: UpdateApiKeyInput }) => {
			const res = await api['api-keys'][':id'].$patch({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			return handleResponse(res)
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: apiKeyKeys.list(workspaceId ?? '') })
			queryClient.invalidateQueries({ queryKey: apiKeyKeys.detail(workspaceId ?? '', id) })
		},
	})
}

/**
 * Delete/revoke an API key.
 */
export function useDeleteApiKeyMutation(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api['api-keys'][':id'].$delete({
				param: { id },
				query: { workspaceId: workspaceId! },
			})
			return handleResponse(res)
		},
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
