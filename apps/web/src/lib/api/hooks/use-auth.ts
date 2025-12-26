'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../client'

export type { OAuthProviders } from '../client'

export function useOAuthProviders() {
	return useQuery({
		queryKey: ['auth', 'providers'],
		queryFn: async () => {
			const result = await apiClient.auth.getProviders()
			return result.providers
		},
		staleTime: 1000 * 60 * 60, // Cache for 1 hour (providers don't change at runtime)
	})
}
