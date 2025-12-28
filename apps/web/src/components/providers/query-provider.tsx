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
							// Don't retry on client errors (check message patterns)
							if (error instanceof Error) {
								const msg = error.message.toLowerCase()
								// Don't retry auth, validation, or not found errors
								if (
									msg.includes('unauthorized') ||
									msg.includes('forbidden') ||
									msg.includes('not found') ||
									msg.includes('invalid') ||
									msg.includes('validation')
								) {
									return false
								}
							}
							return failureCount < 2
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
