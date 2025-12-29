'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, type UpdateUserPreferencesInput, type UserPreferences } from '../client'

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
		queryFn: () => apiClient.userPreferences.get(),
	})
}

/**
 * Hook to update user preferences
 */
export function useUpdateUserPreferencesMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: UpdateUserPreferencesInput) => apiClient.userPreferences.update(data),
		onSuccess: (data) => {
			queryClient.setQueryData(userPreferencesKeys.detail(), data)
		},
	})
}
