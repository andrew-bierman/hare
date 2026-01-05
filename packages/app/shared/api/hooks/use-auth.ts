'use client'

import { useQuery } from '@tanstack/react-query'
import { auth } from '@hare/api-client'
import { authKeys } from './query-keys'

/** OAuth provider availability */
export interface OAuthProviders {
	google: boolean
	github: boolean
}

/** Auth provider cache TTL (1 hour) - providers don't change at runtime */
const AUTH_PROVIDER_CACHE_TTL_MS = 1000 * 60 * 60

export function useOAuthProvidersQuery() {
	return useQuery({
		queryKey: authKeys.providers(),
		queryFn: async () => {
			const res = await auth.providers.$get()
			if (!res.ok) throw new Error('Request failed')
			const result = await res.json()
			return result.providers
		},
		staleTime: AUTH_PROVIDER_CACHE_TTL_MS,
	})
}
