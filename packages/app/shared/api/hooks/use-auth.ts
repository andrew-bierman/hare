'use client'

import { useQuery } from '@tanstack/react-query'
import { api, handleResponse } from '../client'
import { authKeys } from './query-keys'

/** Auth provider cache TTL (1 hour) - providers don't change at runtime */
const AUTH_PROVIDER_CACHE_TTL_MS = 1000 * 60 * 60

export function useOAuthProvidersQuery() {
	return useQuery({
		queryKey: authKeys.providers(),
		queryFn: async () => {
			const res = await api.auth.providers.$get()
			const result = await handleResponse(res)
			return result.providers
		},
		staleTime: AUTH_PROVIDER_CACHE_TTL_MS,
	})
}
