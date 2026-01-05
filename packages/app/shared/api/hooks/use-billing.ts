'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billing } from '@hare/api-client'
import { billingKeys } from './query-keys'

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
			const res = await billing.plans.$get({ query: { workspaceId: workspaceId! } })
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
			const res = await billing.status.$get({ query: { workspaceId: workspaceId! } })
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
			const res = await billing.history.$get({
				query: {
					workspaceId: options.workspaceId!,
					limit: options.limit,
					starting_after: options.startingAfter,
				},
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
			const res = await billing.checkout.$post({
				query: { workspaceId: params.workspaceId },
				json: {
					planId: params.planId,
					successUrl: params.successUrl,
					cancelUrl: params.cancelUrl,
				},
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
			const res = await billing.portal.$post({
				query: { workspaceId: params.workspaceId },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
	})
}
