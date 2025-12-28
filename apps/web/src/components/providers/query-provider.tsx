'use client'

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { type ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				mutationCache: new MutationCache({
					onError: (error) => {
						// Global mutation error handler
						console.error('Mutation error:', error.message)
					},
				}),
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000,
						gcTime: 5 * 60 * 1000,
						refetchOnWindowFocus: false,
						retry: (failureCount, error) => {
							// Don't retry on 4xx errors
							if (error instanceof Error && 'status' in error) {
								const status = (error as Error & { status: number }).status
								if (status >= 400 && status < 500) return false
							}
							return failureCount < 3
						},
					},
					mutations: {
						retry: false,
					},
				},
			}),
	)

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	)
}
