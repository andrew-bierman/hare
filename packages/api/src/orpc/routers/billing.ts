/**
 * oRPC Billing Router
 *
 * Usage-based billing with credits.
 * - Every workspace gets 1,000 free credits/month
 * - Users can buy credit packs via Stripe Checkout
 * - 1 credit = 1 message
 */

import { workspaces } from '@hare/db/schema'
import type { CloudflareEnv } from '@hare/types'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { z } from 'zod'
import { getBillingUsage } from '../../services/billing-usage'
import { CREDIT_PACKS, FREE_MONTHLY_TOKENS, getCreditsBalance } from '../../services/credits'
import { badRequest, requireWrite, serverError } from '../base'

// =============================================================================
// Helpers
// =============================================================================

function getStripe(env: CloudflareEnv): Stripe {
	const secretKey = env.STRIPE_SECRET_KEY
	if (!secretKey) {
		serverError('STRIPE_SECRET_KEY is not configured')
	}
	return new Stripe(secretKey, { typescript: true })
}

function getAppUrl(env: CloudflareEnv): string {
	return env.APP_URL || 'http://localhost:3000'
}

// =============================================================================
// Schemas
// =============================================================================

const CreditsStatusSchema = z.object({
	creditsBalance: z.number(),
	freeMonthlyTokens: z.number(),
	usage: z.object({
		messagesUsed: z.number(),
		totalTokens: z.number(),
		agentsUsed: z.number(),
	}),
	creditPacks: z.array(
		z.object({
			id: z.string(),
			credits: z.number(),
			price: z.number(),
			label: z.string(),
		}),
	),
})

const BuyCreditsInputSchema = z.object({
	packId: z.string(),
	successUrl: z.string().url().optional(),
	cancelUrl: z.string().url().optional(),
})

const BuyCreditsOutputSchema = z.object({
	url: z.string().url(),
	sessionId: z.string(),
})

// =============================================================================
// Procedures
// =============================================================================

/** Get credits balance and usage stats */
export const getCreditsStatus = requireWrite
	.route({ method: 'GET', path: '/billing/credits' })
	.output(CreditsStatusSchema)
	.handler(async ({ context }) => {
		const { db, workspace } = context

		const creditsBalance = await getCreditsBalance({ db, workspaceId: workspace.id })

		const usageStats = await getBillingUsage({ db, workspaceId: workspace.id })

		return {
			creditsBalance,
			freeMonthlyTokens: FREE_MONTHLY_TOKENS,
			usage: {
				messagesUsed: usageStats.messagesUsed,
				totalTokens: usageStats.totalTokens,
				agentsUsed: usageStats.agentsUsed,
			},
			creditPacks: CREDIT_PACKS.map((p) => ({
				id: p.id,
				credits: p.credits,
				price: p.price,
				label: p.label,
			})),
		}
	})

/** Create Stripe checkout session to buy a credit pack */
export const buyCredits = requireWrite
	.route({ method: 'POST', path: '/billing/buy-credits' })
	.input(BuyCreditsInputSchema)
	.output(BuyCreditsOutputSchema)
	.handler(async ({ input, context }) => {
		const { packId, successUrl, cancelUrl } = input
		const { db, workspace, user, env } = context

		const pack = CREDIT_PACKS.find((p) => p.id === packId)
		if (!pack) {
			badRequest('Invalid credit pack')
		}

		const stripe = getStripe(env)
		const appUrl = getAppUrl(env)

		// Get or create Stripe customer
		const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))
		let customerId = ws?.stripeCustomerId

		if (!customerId) {
			const customer = await stripe.customers.create({
				email: user.email,
				name: user.name || undefined,
				metadata: { workspaceId: workspace.id, userId: user.id },
			})
			customerId = customer.id

			await db
				.update(workspaces)
				.set({ stripeCustomerId: customerId, updatedAt: new Date() })
				.where(eq(workspaces.id, workspace.id))
		}

		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			mode: 'payment',
			line_items: [
				{
					price_data: {
						currency: 'usd',
						product_data: {
							name: `${pack.label} — Hare Credits`,
							description: `${pack.credits.toLocaleString()} credits for your Hare workspace`,
						},
						unit_amount: pack.price * 100, // cents
					},
					quantity: 1,
				},
			],
			success_url: successUrl || `${appUrl}/dashboard/settings/billing?credits=success`,
			cancel_url: cancelUrl || `${appUrl}/dashboard/settings/billing?credits=canceled`,
			metadata: {
				workspaceId: workspace.id,
				creditPackId: pack.id,
				creditsAmount: String(pack.credits),
			},
		})

		if (!session.url) {
			badRequest('Failed to create checkout session')
		}

		return { url: session.url, sessionId: session.id }
	})

// =============================================================================
// Router Export
// =============================================================================

export const billingRouter = {
	getCreditsStatus,
	buyCredits,
}
