'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { user } from '@hare/api-client'

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
			const res = await user.preferences.$get()
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
			const res = await user.preferences.$patch({ json: data })
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: (data) => {
			queryClient.setQueryData(userPreferencesKeys.detail(), data)
		},
	})
}
