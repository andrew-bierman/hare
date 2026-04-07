/**
 * Billing Routes
 *
 * Usage-based billing with token credits.
 * - Every workspace gets 100,000 free tokens/month
 * - Users can buy credit packs via Stripe Checkout
 * - 1 credit = 1 token (input or output)
 * Webhook endpoint is in billing-webhook.ts (separate, no auth, raw body).
 */

import { workspaces } from '@hare/db/schema'
import type { CloudflareEnv } from '@hare/types'
import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import Stripe from 'stripe'
import { z } from 'zod'
import { getBillingUsage } from '../../services/billing-usage'
import { CREDIT_PACKS, FREE_MONTHLY_TOKENS, getCreditsBalance } from '../../services/credits'
import { writePlugin } from '../context'

// =============================================================================
// Helpers
// =============================================================================

function getStripe(env: CloudflareEnv): Stripe {
	const secretKey = env.STRIPE_SECRET_KEY
	if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured')
	return new Stripe(secretKey, { typescript: true })
}

function getAppUrl(env: CloudflareEnv): string {
	return env.APP_URL || 'http://localhost:3000'
}

// =============================================================================
// Schemas
// =============================================================================

const CREDIT_PACK_IDS = CREDIT_PACKS.map((p) => p.id) as [string, ...string[]]

// App-relative paths only — prevents open-redirect to arbitrary domains
const appRelativePath = z
	.string()
	.regex(/^\/(?!\/)/, 'Must be an app-relative path starting with "/"')

const BuyCreditsBodySchema = z.object({
	packId: z.enum(CREDIT_PACK_IDS),
	successUrl: appRelativePath.optional(),
	cancelUrl: appRelativePath.optional(),
})

// =============================================================================
// Routes
// =============================================================================

export const billingRoutes = new Elysia({ prefix: '/billing', name: 'billing-routes' })
	.use(writePlugin)

	// Get credits balance and usage stats
	.get(
		'/credits',
		async ({ db, workspace }) => {
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
		},
		{ writeAccess: true },
	)

	// Create Stripe checkout session to buy a credit pack
	.post(
		'/buy-credits',
		async ({ db, cfEnv, workspace, user, body }) => {
			const pack = CREDIT_PACKS.find((p) => p.id === body.packId)
			if (!pack) return status(400, { error: 'Invalid credit pack' })

			const stripe = getStripe(cfEnv)
			const appUrl = getAppUrl(cfEnv)

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
				success_url: body.successUrl
					? `${appUrl}${body.successUrl}`
					: `${appUrl}/dashboard/settings/billing?credits=success`,
				cancel_url: body.cancelUrl
					? `${appUrl}${body.cancelUrl}`
					: `${appUrl}/dashboard/settings/billing?credits=canceled`,
				metadata: {
					workspaceId: workspace.id,
					creditPackId: pack.id,
					creditsAmount: String(pack.credits),
				},
			})

			if (!session.url) return status(400, { error: 'Failed to create checkout session' })

			return { url: session.url, sessionId: session.id }
		},
		{ writeAccess: true, body: BuyCreditsBodySchema },
	)
