'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient, type OAuthProviders } from '../../../shared/api'

// Types are available from @shared/api, don't re-export to avoid duplicates

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
