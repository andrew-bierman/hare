'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@hare/api/orpc'
import { billingKeys } from './query-keys'

// =============================================================================
// Types (inferred from oRPC)
// =============================================================================

type PlansOutput = Awaited<ReturnType<typeof orpc.billing.listPlans>>
type StatusOutput = Awaited<ReturnType<typeof orpc.billing.getStatus>>
type PaymentHistoryOutput = Awaited<ReturnType<typeof orpc.billing.getPaymentHistory>>
type CheckoutOutput = Awaited<ReturnType<typeof orpc.billing.createCheckout>>
type PortalOutput = Awaited<ReturnType<typeof orpc.billing.createPortal>>

export type Plan = PlansOutput['plans'][number]
export type BillingStatus = StatusOutput
export type PaymentHistoryItem = PaymentHistoryOutput['payments'][number]

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
 * Note: workspaceId is determined by server context from the authenticated session
 */
export function usePlansQuery(enabled = true) {
	return useQuery({
		queryKey: billingKeys.plans(),
		queryFn: () => orpc.billing.listPlans({}),
		enabled,
	})
}

/**
 * Fetch current billing status for workspace
 * Note: workspaceId is determined by server context from the authenticated session
 */
export function useBillingStatusQuery(enabled = true) {
	return useQuery({
		queryKey: billingKeys.status('current'),
		queryFn: () => orpc.billing.getStatus({}),
		enabled,
	})
}

/**
 * Fetch payment history
 * Note: workspaceId is determined by server context from the authenticated session
 */
export function usePaymentHistoryQuery(options?: { limit?: number; startingAfter?: string }) {
	return useQuery({
		queryKey: billingKeys.invoices('current'),
		queryFn: () =>
			orpc.billing.getPaymentHistory({
				limit: options?.limit,
				starting_after: options?.startingAfter,
			}),
	})
}

/**
 * Create checkout session for upgrading
 * Note: workspaceId is determined by server context from the authenticated session
 */
export function useCreateCheckoutMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (params: CheckoutRequest) =>
			orpc.billing.createCheckout({
				planId: params.planId,
				successUrl: params.successUrl,
				cancelUrl: params.cancelUrl,
			}),
		onSuccess: () => {
			// Invalidate billing queries after checkout
			queryClient.invalidateQueries({ queryKey: billingKeys.status('current') })
			queryClient.invalidateQueries({ queryKey: billingKeys.plans() })
		},
	})
}

/**
 * Create customer portal session
 * Note: workspaceId is determined by server context from the authenticated session
 */
export function useCreatePortalMutation() {
	return useMutation({
		mutationFn: () => orpc.billing.createPortal({}),
	})
}
