'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiClientError } from '../client'

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

export interface UserPreferences {
	id: string
	userId: string
	emailNotifications: boolean
	usageAlerts: boolean
	createdAt: string
	updatedAt: string
}

export interface UpdateUserPreferencesInput {
	emailNotifications?: boolean
	usageAlerts?: boolean
}

/**
 * User preferences query keys
 */
export const userPreferencesKeys = {
	all: ['user-preferences'] as const,
	detail: () => [...userPreferencesKeys.all, 'detail'] as const,
}

/**
 * Hook to fetch user preferences
 */
export function useUserPreferencesQuery() {
	return useQuery({
		queryKey: userPreferencesKeys.detail(),
		queryFn: async () => {
			const res = await api['user-settings'].$get()
			return handleResponse(res)
		},
	})
}

/**
 * Hook to update user preferences
 */
export function useUpdateUserPreferencesMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: UpdateUserPreferencesInput) => {
			const res = await api['user-settings'].$patch({ json: data })
			return handleResponse(res)
		},
		onSuccess: (data) => {
			queryClient.setQueryData(userPreferencesKeys.detail(), data)
		},
	})
}
