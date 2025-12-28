'use client'

import {
	apiClient,
	type CheckoutRequest,
} from '../client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingKeys } from './query-keys'

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch available billing plans
 */
export function usePlans(workspaceId: string | undefined) {
	return useQuery({
		queryKey: billingKeys.plans(),
		queryFn: () => apiClient.billing.getPlans(workspaceId!),
		enabled: !!workspaceId,
	})
}

/**
 * Fetch current billing status for workspace
 */
export function useBillingStatus(workspaceId: string | undefined) {
	return useQuery({
		queryKey: billingKeys.status(workspaceId ?? ''),
		queryFn: () => apiClient.billing.getStatus(workspaceId!),
		enabled: !!workspaceId,
	})
}

/**
 * Fetch payment history
 */
export function usePaymentHistory(options: {
	workspaceId: string | undefined
	limit?: number
	startingAfter?: string
}) {
	return useQuery({
		queryKey: billingKeys.invoices(options.workspaceId ?? ''),
		queryFn: () =>
			apiClient.billing.getHistory(options.workspaceId!, {
				limit: options.limit,
				starting_after: options.startingAfter,
			}),
		enabled: !!options.workspaceId,
	})
}

/**
 * Create checkout session for upgrading
 */
export function useCreateCheckout() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (params: { workspaceId: string } & CheckoutRequest) =>
			apiClient.billing.createCheckout(params.workspaceId, {
				planId: params.planId,
				successUrl: params.successUrl,
				cancelUrl: params.cancelUrl,
			}),
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
export function useCreatePortal() {
	return useMutation({
		mutationFn: (params: { workspaceId: string }) =>
			apiClient.billing.createPortal(params.workspaceId),
	})
}
