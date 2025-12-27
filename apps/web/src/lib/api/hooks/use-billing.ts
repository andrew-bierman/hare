'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'

// =============================================================================
// Types
// =============================================================================

export interface PlanFeatures {
	maxAgents: number
	maxMessagesPerMonth: number
}

export interface Plan {
	id: string
	name: string
	description: string
	price: number | null
	priceId: string | null
	features: PlanFeatures
}

export interface PlansResponse {
	plans: Plan[]
	currentPlanId: string | null
}

export interface BillingStatus {
	planId: string
	planName: string
	status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none'
	currentPeriodEnd: string | null
	cancelAtPeriodEnd: boolean
	usage: {
		agentsUsed: number
		agentsLimit: number
		messagesUsed: number
		messagesLimit: number
	}
}

export interface CheckoutRequest {
	planId: 'pro' | 'team'
	successUrl?: string
	cancelUrl?: string
}

export interface CheckoutResponse {
	url: string
	sessionId: string
}

export interface PortalResponse {
	url: string
}

export interface PaymentHistoryItem {
	id: string
	amount: number
	currency: string
	status: string
	description: string | null
	createdAt: string
	invoiceUrl: string | null
}

export interface PaymentHistoryResponse {
	payments: PaymentHistoryItem[]
	hasMore: boolean
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch available billing plans
 */
export function usePlans(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['billing', 'plans', workspaceId],
		queryFn: () => apiClient.billing.getPlans(workspaceId!),
		enabled: !!workspaceId,
	})
}

/**
 * Fetch current billing status for workspace
 */
export function useBillingStatus(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['billing', 'status', workspaceId],
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
		queryKey: ['billing', 'history', options.workspaceId, options.limit, options.startingAfter],
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
			queryClient.invalidateQueries({ queryKey: ['billing', 'status', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['billing', 'plans', workspaceId] })
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
