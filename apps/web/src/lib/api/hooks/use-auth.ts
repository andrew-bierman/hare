'use client'

import { apiClient } from '@hare/api/client'
import { useQuery } from '@tanstack/react-query'

export type { OAuthProviders } from '@hare/api/client'

/** Auth provider cache TTL (1 hour) - providers don't change at runtime */
const AUTH_PROVIDER_CACHE_TTL_MS = 1000 * 60 * 60

export function useOAuthProviders() {
	return useQuery({
		queryKey: ['auth', 'providers'],
		queryFn: async () => {
			const result = await apiClient.auth.getProviders()
			return result.providers
		},
		staleTime: AUTH_PROVIDER_CACHE_TTL_MS,
	})
}
