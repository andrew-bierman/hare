'use client'

import { useQuery } from '@tanstack/react-query'
import type { OAuthProviders } from '@hare/types'
import { authKeys } from './query-keys'

// Re-export type for convenience
export type { OAuthProviders }

/** Auth provider cache TTL (1 hour) - providers don't change at runtime */
const AUTH_PROVIDER_CACHE_TTL_MS = 1000 * 60 * 60

export function useOAuthProvidersQuery() {
	return useQuery({
		queryKey: authKeys.providers(),
		queryFn: async () => {
			const res = await fetch('/api/auth/providers', { credentials: 'include' })
			if (!res.ok) throw new Error('Failed to fetch OAuth providers')
			const result = (await res.json()) as { providers: OAuthProviders }
			return result.providers
		},
		staleTime: AUTH_PROVIDER_CACHE_TTL_MS,
	})
}
