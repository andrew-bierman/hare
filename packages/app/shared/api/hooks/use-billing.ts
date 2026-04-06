'use client'

import { api } from '@hare/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingKeys } from './query-keys'

// =============================================================================
// Types
// =============================================================================

export interface Plan {
	id: string
	name: string
	price: number
	features: string[]
}

export interface BillingStatus {
	planId: string
	subscriptionStatus: string | null
	currentPeriodEnd: string | null
}

export interface PaymentHistoryItem {
	id: string
	amount: number
	status: string
	createdAt: string
}

export interface CheckoutRequest {
	planId: 'pro' | 'team'
	successUrl?: string
	cancelUrl?: string
}

// Helper to unwrap Eden Treaty response
async function unwrap<T>(promise: Promise<{ data: T | null; error: unknown }>): Promise<T> {
	const { data, error } = await promise
	if (error) throw error
	return data as T
}

// =============================================================================
// Hooks
// =============================================================================

export function usePlansQuery(enabled = true) {
	return useQuery({
		queryKey: billingKeys.plans(),
		queryFn: () => unwrap(api.api.billing.plans.get()),
		enabled,
	})
}

export function useBillingStatusQuery(enabled = true) {
	return useQuery({
		queryKey: billingKeys.status('current'),
		queryFn: () => unwrap(api.api.billing.status.get()),
		enabled,
	})
}

export function usePaymentHistoryQuery(options?: { limit?: number; startingAfter?: string }) {
	return useQuery({
		queryKey: billingKeys.invoices('current'),
		queryFn: () =>
			unwrap(api.api.billing['payment-history'].get({
				query: {
					limit: options?.limit,
					starting_after: options?.startingAfter,
				},
			})),
	})
}

export function useCreateCheckoutMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (params: CheckoutRequest) =>
			unwrap(api.api.billing.checkout.post({
				planId: params.planId,
				successUrl: params.successUrl,
				cancelUrl: params.cancelUrl,
			})),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: billingKeys.status('current') })
			queryClient.invalidateQueries({ queryKey: billingKeys.plans() })
		},
	})
}

export function useCreatePortalMutation() {
	return useMutation({
		mutationFn: () => unwrap(api.api.billing.portal.post({})),
	})
}
