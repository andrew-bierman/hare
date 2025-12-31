'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiClientError } from '../client'
import { billingKeys } from './query-keys'

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

export interface CheckoutRequest {
	planId: 'pro' | 'team'
	successUrl?: string
	cancelUrl?: string
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch available billing plans
 */
export function usePlansQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: billingKeys.plans(),
		queryFn: async () => {
			const res = await api.billing.plans.$get({ query: { workspaceId: workspaceId! } })
			return handleResponse(res)
		},
		enabled: !!workspaceId,
	})
}

/**
 * Fetch current billing status for workspace
 */
export function useBillingStatusQuery(workspaceId: string | undefined) {
	return useQuery({
		queryKey: billingKeys.status(workspaceId ?? ''),
		queryFn: async () => {
			const res = await api.billing.status.$get({ query: { workspaceId: workspaceId! } })
			return handleResponse(res)
		},
		enabled: !!workspaceId,
	})
}

/**
 * Fetch payment history
 */
export function usePaymentHistoryQuery(options: {
	workspaceId: string | undefined
	limit?: number
	startingAfter?: string
}) {
	return useQuery({
		queryKey: billingKeys.invoices(options.workspaceId ?? ''),
		queryFn: async () => {
			const res = await api.billing.history.$get({
				query: {
					workspaceId: options.workspaceId!,
					limit: options.limit?.toString(),
					starting_after: options.startingAfter,
				},
			})
			return handleResponse(res)
		},
		enabled: !!options.workspaceId,
	})
}

/**
 * Create checkout session for upgrading
 */
export function useCreateCheckoutMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (params: { workspaceId: string } & CheckoutRequest) => {
			const res = await api.billing.checkout.$post({
				query: { workspaceId: params.workspaceId },
				json: {
					planId: params.planId,
					successUrl: params.successUrl,
					cancelUrl: params.cancelUrl,
				},
			})
			return handleResponse(res)
		},
		onSuccess: (_, { workspaceId }) => {
			// Invalidate billing queries after checkout
			queryClient.invalidateQueries({ queryKey: billingKeys.status(workspaceId) })
			queryClient.invalidateQueries({ queryKey: billingKeys.plans() })
		},
	})
}

/**
 * Create customer portal session
 */
export function useCreatePortalMutation() {
	return useMutation({
		mutationFn: async (params: { workspaceId: string }) => {
			const res = await api.billing.portal.$post({
				query: { workspaceId: params.workspaceId },
				json: {},
			})
			return handleResponse(res)
		},
	})
}
