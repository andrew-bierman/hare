'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	apiClient,
	type BillingPlan,
	type BillingPlansResponse,
	type BillingStatus,
	type CheckoutRequest,
	type CheckoutResponse,
	type PaymentHistoryItem,
	type PaymentHistoryResponse,
	type PortalResponse,
} from '@shared/api'

// Re-export types
export type {
	BillingPlan,
	BillingPlansResponse,
	BillingStatus,
	CheckoutRequest,
	CheckoutResponse,
	PaymentHistoryItem,
	PaymentHistoryResponse,
	PortalResponse,
}

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
