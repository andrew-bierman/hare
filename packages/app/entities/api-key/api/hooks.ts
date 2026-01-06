'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiKeys } from '@hare/api-client'

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
export function useApiKeys(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['api-keys', workspaceId],
		queryFn: async () => {
			const res = await apiKeys.index.$get({ query: { workspaceId: workspaceId! } })
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		enabled: !!workspaceId,
	})
}

/**
 * Fetch a single API key by ID.
 */
export function useApiKey(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['api-keys', workspaceId, id],
		queryFn: async () => {
			const res = await apiKeys[':id'].$get({
				param: { id: id! },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
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
		mutationFn: async (data: CreateApiKeyInput) => {
			const res = await apiKeys.index.$post({
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
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
		mutationFn: async ({ id, data }: { id: string; data: UpdateApiKeyInput }) => {
			const res = await apiKeys[':id'].$patch({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
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
		mutationFn: async (id: string) => {
			const res = await apiKeys[':id'].$delete({
				param: { id },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['api-keys', workspaceId] })
		},
	})
}
