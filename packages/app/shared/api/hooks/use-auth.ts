'use client'

import { useQuery } from '@tanstack/react-query'
import { api, ApiClientError } from '../client'
import { authKeys } from './query-keys'

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
