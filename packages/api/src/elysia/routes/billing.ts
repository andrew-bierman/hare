/**
 * Billing Routes
 *
 * Plans, checkout, portal, status, and payment history.
 * Webhook endpoint is in billing-webhook.ts (separate, no auth, raw body).
 */

import { config } from '@hare/config'
import { workspaces } from '@hare/db/schema'
import type { CloudflareEnv } from '@hare/types'
import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import Stripe from 'stripe'
import { CheckoutRequestSchema } from '../../schemas'
import { getBillingUsage } from '../../services/billing-usage'
import { writePlugin } from '../context'

// =============================================================================
// Pricing Plans
// =============================================================================

const BILLING_PLANS = {
	free: {
		id: 'free',
		name: 'Free',
		description: 'Get started with AI agents',
		price: 0,
		priceId: null,
		features: { maxAgents: 3, maxMessagesPerMonth: 1000 },
	},
	pro: {
		id: 'pro',
		name: 'Pro',
		description: 'For growing teams',
		price: 29,
		priceId: 'price_pro_monthly',
		features: { maxAgents: 20, maxMessagesPerMonth: 50000 },
	},
	team: {
		id: 'team',
		name: 'Team',
		description: 'For larger organizations',
		price: 99,
		priceId: 'price_team_monthly',
		features: { maxAgents: -1, maxMessagesPerMonth: 500000 },
	},
	enterprise: {
		id: 'enterprise',
		name: 'Enterprise',
		description: 'Custom solutions for your business',
		price: null,
		priceId: null,
		features: { maxAgents: -1, maxMessagesPerMonth: -1 },
	},
} as const

type PlanId = keyof typeof BILLING_PLANS

function isValidPlanId(value: string | null | undefined): value is PlanId {
	return value !== null && value !== undefined && value in BILLING_PLANS
}

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
// Routes
// =============================================================================

export const billingRoutes = new Elysia({ prefix: '/billing', name: 'billing-routes' })
	.use(writePlugin)

	// List available plans
	.get(
		'/plans',
		async ({ db, workspace }) => {
			const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

			const plans = Object.values(BILLING_PLANS).map((plan) => ({
				id: plan.id as 'free' | 'pro' | 'team' | 'enterprise',
				name: plan.name,
				description: plan.description,
				price: plan.price,
				priceId: plan.priceId,
				features: {
					maxAgents: plan.features.maxAgents,
					maxMessagesPerMonth: plan.features.maxMessagesPerMonth,
				},
			}))

			return { plans, currentPlanId: ws?.planId || 'free' }
		},
		{ writeAccess: true },
	)

	// Create Stripe checkout session
	.post(
		'/checkout',
		async ({ db, cfEnv, workspace, user, body }) => {
			const plan = BILLING_PLANS[body.planId as PlanId]
			if (!plan || !plan.priceId) return status(400, { error: 'Invalid plan selected' })

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
				mode: 'subscription',
				line_items: [{ price: plan.priceId, quantity: 1 }],
				success_url: body.successUrl || `${appUrl}/dashboard/settings/billing?success=true`,
				cancel_url: body.cancelUrl || `${appUrl}/dashboard/settings/billing?canceled=true`,
				metadata: { workspaceId: workspace.id, planId: body.planId },
				subscription_data: {
					metadata: { workspaceId: workspace.id, planId: body.planId },
				},
			})

			if (!session.url) return status(400, { error: 'Failed to create checkout session' })

			return { url: session.url, sessionId: session.id }
		},
		{ writeAccess: true, body: CheckoutRequestSchema },
	)

	// Create Stripe customer portal session
	.post(
		'/portal',
		async ({ db, cfEnv, workspace }) => {
			const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

			if (!ws?.stripeCustomerId) {
				return status(400, {
					error: 'No billing account found. Please upgrade to a paid plan first.',
				})
			}

			const stripe = getStripe(cfEnv)
			const appUrl = getAppUrl(cfEnv)

			const session = await stripe.billingPortal.sessions.create({
				customer: ws.stripeCustomerId,
				return_url: `${appUrl}/dashboard/settings/billing`,
			})

			return { url: session.url }
		},
		{ writeAccess: true },
	)

	// Get billing status
	.get(
		'/status',
		async ({ db, cfEnv, workspace }) => {
			const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

			const planId: PlanId = isValidPlanId(ws?.planId) ? ws.planId : 'free'
			const plan = BILLING_PLANS[planId]

			let subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none' = 'none'
			let currentPeriodEnd: string | null = null
			let cancelAtPeriodEnd = false
			let periodStart: Date | undefined

			if (ws?.stripeSubscriptionId && ws.stripeCustomerId) {
				try {
					const stripe = getStripe(cfEnv)
					const subscriptionResponse = await stripe.subscriptions.retrieve(ws.stripeSubscriptionId)
					const subscription =
						'data' in subscriptionResponse
							? (subscriptionResponse as { data: Stripe.Subscription }).data
							: (subscriptionResponse as Stripe.Subscription)

					subscriptionStatus = subscription.status as typeof subscriptionStatus
					const periodEndTimestamp = (
						subscription as Stripe.Subscription & { current_period_end: number }
					).current_period_end
					currentPeriodEnd = new Date(periodEndTimestamp * 1000).toISOString()
					cancelAtPeriodEnd = subscription.cancel_at_period_end

					const periodEndDate = new Date(periodEndTimestamp * 1000)
					periodStart = new Date(periodEndDate)
					periodStart.setMonth(periodStart.getMonth() - 1)
				} catch {
					subscriptionStatus = 'none'
				}
			} else if (planId === 'free') {
				subscriptionStatus = 'active'
			}

			const usageStats = await getBillingUsage({
				db,
				workspaceId: workspace.id,
				periodStart,
			})

			return {
				planId: planId as 'free' | 'pro' | 'team' | 'enterprise',
				planName: plan.name,
				status: subscriptionStatus as 'active' | 'canceled' | 'past_due' | 'trialing' | 'none',
				currentPeriodEnd,
				cancelAtPeriodEnd,
				usage: {
					agentsUsed: usageStats.agentsUsed,
					agentsLimit: plan.features.maxAgents,
					messagesUsed: usageStats.messagesUsed,
					messagesLimit: plan.features.maxMessagesPerMonth,
				},
			}
		},
		{ writeAccess: true },
	)

	// Get payment history
	.get(
		'/history',
		async ({ db, cfEnv, workspace, query }) => {
			const limit = Number(query?.limit) || 10
			const startingAfter = query?.starting_after as string | undefined

			const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

			if (!ws?.stripeCustomerId) {
				return { payments: [], hasMore: false }
			}

			const stripe = getStripe(cfEnv)

			const charges = await stripe.charges.list({
				customer: ws.stripeCustomerId,
				limit,
				starting_after: startingAfter,
			})

			const payments = charges.data.map((charge) => ({
				id: charge.id,
				amount: charge.amount / config.CURRENCY.CENTS_PER_DOLLAR,
				currency: charge.currency.toUpperCase(),
				status: charge.status,
				description: charge.description,
				createdAt: new Date(charge.created * 1000).toISOString(),
				invoiceUrl: charge.receipt_url,
			}))

			return { payments, hasMore: charges.has_more }
		},
		{ writeAccess: true },
	)
