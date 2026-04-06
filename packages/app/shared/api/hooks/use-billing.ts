'use client'

import { orpc } from '@hare/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingKeys } from './query-keys'

// =============================================================================
// Types (inferred from oRPC)
// =============================================================================

type CreditsStatusOutput = Awaited<ReturnType<typeof orpc.billing.getCreditsStatus>>

export type CreditsStatus = CreditsStatusOutput
export type CreditPack = CreditsStatusOutput['creditPacks'][number]

export interface BuyCreditsRequest {
	packId: string
	successUrl?: string
	cancelUrl?: string
}

// =============================================================================
// Hooks
// =============================================================================

/** Fetch token credits balance and usage stats */
export function useCreditsStatusQuery(enabled = true) {
	return useQuery({
		queryKey: billingKeys.status('credits'),
		queryFn: () => orpc.billing.getCreditsStatus({}),
		enabled,
	})
}

/** Buy a credit pack — redirects to Stripe Checkout */
export function useBuyCreditsMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (params: BuyCreditsRequest) =>
			orpc.billing.buyCredits({
				packId: params.packId,
				successUrl: params.successUrl,
				cancelUrl: params.cancelUrl,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: billingKeys.status('credits') })
		},
	})
}
