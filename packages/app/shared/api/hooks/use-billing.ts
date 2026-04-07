'use client'

import { client } from '@hare/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingKeys } from './query-keys'

// =============================================================================
// Types
// =============================================================================

export interface CreditsStatus {
	creditsBalance: number
	freeMonthlyTokens: number
	usage: {
		messagesUsed: number
		totalTokens: number
		agentsUsed: number
	}
	creditPacks: CreditPack[]
}

export interface CreditPack {
	id: string
	credits: number
	price: number
	label: string
}

export interface BuyCreditsRequest {
	packId: string
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

/** Fetch token credits balance and usage stats */
export function useCreditsStatusQuery(workspaceId?: string, enabled = true) {
	return useQuery({
		queryKey: billingKeys.status(workspaceId ?? 'credits'),
		queryFn: () => unwrap(client.api.billing.credits.get()),
		enabled,
	})
}

/** Buy a credit pack — redirects to Stripe Checkout */
export function useBuyCreditsMutation(workspaceId?: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (params: BuyCreditsRequest) =>
			unwrap(
				client.api.billing['buy-credits'].post({
					packId: params.packId,
					successUrl: params.successUrl,
					cancelUrl: params.cancelUrl,
				}),
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: billingKeys.status(workspaceId ?? 'credits') })
		},
	})
}
