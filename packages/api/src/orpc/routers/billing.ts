/**
 * oRPC Billing Router
 *
 * Handles billing-related operations including plans, checkout, portal, and payment history.
 * Webhook endpoint remains as a Hono route since it doesn't need auth and has special signature verification.
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { workspaces } from '@hare/db/schema'
import { requireWrite, badRequest, type WorkspaceContext } from '../base'
import {
	BillingStatusSchema,
	CheckoutRequestSchema,
	CheckoutResponseSchema,
	PaymentHistoryQuerySchema,
	PaymentHistoryResponseSchema,
	PlansResponseSchema,
	PortalResponseSchema,
} from '../../schemas'
import { getBillingUsage } from '../../services/billing-usage'
import type { CloudflareEnv } from '@hare/types'

// =============================================================================
// Pricing Plans
// =============================================================================

const BILLING_PLANS = {
	free: {
		id: 'free',
		name: 'Free',
		description: 'Get started with AI agents',
		price: 0,
		priceId: null, // No Stripe price for free tier
		features: {
			maxAgents: 3,
			maxMessagesPerMonth: 1000,
		},
	},
	pro: {
		id: 'pro',
		name: 'Pro',
		description: 'For growing teams',
		price: 29,
		priceId: 'price_pro_monthly', // Replace with actual Stripe price ID
		features: {
			maxAgents: 20,
			maxMessagesPerMonth: 50000,
		},
	},
	team: {
		id: 'team',
		name: 'Team',
		description: 'For larger organizations',
		price: 99,
		priceId: 'price_team_monthly', // Replace with actual Stripe price ID
		features: {
			maxAgents: -1, // Unlimited
			maxMessagesPerMonth: 500000,
		},
	},
	enterprise: {
		id: 'enterprise',
		name: 'Enterprise',
		description: 'Custom solutions for your business',
		price: null, // Custom pricing
		priceId: null,
		features: {
			maxAgents: -1, // Unlimited
			maxMessagesPerMonth: -1, // Unlimited
		},
	},
} as const

type PlanId = keyof typeof BILLING_PLANS

/**
 * Validates that a string is a valid PlanId.
 */
function isValidPlanId(value: string | null | undefined): value is PlanId {
	return value !== null && value !== undefined && value in BILLING_PLANS
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStripe(env: CloudflareEnv): Stripe {
	const secretKey = env.STRIPE_SECRET_KEY
	if (!secretKey) {
		throw new Error('STRIPE_SECRET_KEY is not configured')
	}
	return new Stripe(secretKey, {
		typescript: true,
	})
}

function getAppUrl(env: CloudflareEnv): string {
	return env.APP_URL || 'http://localhost:3000'
}

// =============================================================================
// Procedures
// =============================================================================

/**
 * List available billing plans with current workspace's plan
 */
export const listPlans = requireWrite
	.route({ method: 'GET', path: '/billing/plans' })
	.output(PlansResponseSchema)
	.handler(async ({ context }) => {
		const { db, workspace } = context

		// Get current workspace to check plan
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

		return {
			plans,
			currentPlanId: ws?.planId || 'free',
		}
	})

/**
 * Create Stripe checkout session for upgrading to a paid plan
 */
export const createCheckout = requireWrite
	.route({ method: 'POST', path: '/billing/checkout' })
	.input(CheckoutRequestSchema)
	.output(CheckoutResponseSchema)
	.handler(async ({ input, context }) => {
		const { planId, successUrl, cancelUrl } = input
		const { db, workspace, user, env } = context

		const plan = BILLING_PLANS[planId]
		if (!plan || !plan.priceId) {
			badRequest('Invalid plan selected')
		}

		const stripe = getStripe(env)
		const appUrl = getAppUrl(env)

		// Get or create Stripe customer
		const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

		let customerId = ws?.stripeCustomerId

		if (!customerId) {
			// Create new customer
			const customer = await stripe.customers.create({
				email: user.email,
				name: user.name || undefined,
				metadata: {
					workspaceId: workspace.id,
					userId: user.id,
				},
			})
			customerId = customer.id

			// Save customer ID
			await db
				.update(workspaces)
				.set({ stripeCustomerId: customerId, updatedAt: new Date() })
				.where(eq(workspaces.id, workspace.id))
		}

		// Create checkout session
		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			mode: 'subscription',
			line_items: [
				{
					price: plan.priceId,
					quantity: 1,
				},
			],
			success_url: successUrl || `${appUrl}/dashboard/settings/billing?success=true`,
			cancel_url: cancelUrl || `${appUrl}/dashboard/settings/billing?canceled=true`,
			metadata: {
				workspaceId: workspace.id,
				planId,
			},
			subscription_data: {
				metadata: {
					workspaceId: workspace.id,
					planId,
				},
			},
		})

		if (!session.url) {
			badRequest('Failed to create checkout session')
		}

		return {
			url: session.url,
			sessionId: session.id,
		}
	})

/**
 * Create Stripe customer portal session for managing subscription
 */
export const createPortal = requireWrite
	.route({ method: 'POST', path: '/billing/portal' })
	.output(PortalResponseSchema)
	.handler(async ({ context }) => {
		const { db, workspace, env } = context

		const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

		if (!ws?.stripeCustomerId) {
			badRequest('No billing account found. Please upgrade to a paid plan first.')
		}

		const stripe = getStripe(env)
		const appUrl = getAppUrl(env)

		const session = await stripe.billingPortal.sessions.create({
			customer: ws.stripeCustomerId,
			return_url: `${appUrl}/dashboard/settings/billing`,
		})

		return { url: session.url }
	})

/**
 * Get billing status with usage for the workspace
 */
export const getStatus = requireWrite
	.route({ method: 'GET', path: '/billing/status' })
	.output(BillingStatusSchema)
	.handler(async ({ context }) => {
		const { db, workspace, env } = context

		const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

		const planId: PlanId = isValidPlanId(ws?.planId) ? ws.planId : 'free'
		const plan = BILLING_PLANS[planId]

		let status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none' = 'none'
		let currentPeriodEnd: string | null = null
		let cancelAtPeriodEnd = false
		let periodStart: Date | undefined

		// Check subscription status from Stripe if there's a subscription
		if (ws?.stripeSubscriptionId && ws.stripeCustomerId) {
			try {
				const stripe = getStripe(env)
				const subscriptionResponse = await stripe.subscriptions.retrieve(ws.stripeSubscriptionId)
				// The subscription data might be wrapped or direct depending on SDK version
				const subscription =
					'data' in subscriptionResponse
						? (subscriptionResponse as { data: Stripe.Subscription }).data
						: (subscriptionResponse as Stripe.Subscription)

				status = subscription.status as typeof status
				const periodEndTimestamp = (
					subscription as Stripe.Subscription & { current_period_end: number }
				).current_period_end
				currentPeriodEnd = new Date(periodEndTimestamp * 1000).toISOString()
				cancelAtPeriodEnd = subscription.cancel_at_period_end

				// Calculate period start from subscription (typically 1 month before period end)
				const periodEndDate = new Date(periodEndTimestamp * 1000)
				periodStart = new Date(periodEndDate)
				periodStart.setMonth(periodStart.getMonth() - 1)
			} catch {
				// Subscription may have been deleted
				status = 'none'
			}
		} else if (planId === 'free') {
			status = 'active' // Free plan is always active
		}

		// Get actual usage stats from the database
		const usageStats = await getBillingUsage({
			db,
			workspaceId: workspace.id,
			periodStart,
		})

		return {
			planId: planId as 'free' | 'pro' | 'team' | 'enterprise',
			planName: plan.name,
			status,
			currentPeriodEnd,
			cancelAtPeriodEnd,
			usage: {
				agentsUsed: usageStats.agentsUsed,
				agentsLimit: plan.features.maxAgents,
				messagesUsed: usageStats.messagesUsed,
				messagesLimit: plan.features.maxMessagesPerMonth,
			},
		}
	})

/**
 * Get payment history from Stripe
 */
export const getPaymentHistory = requireWrite
	.route({ method: 'GET', path: '/billing/history' })
	.input(PaymentHistoryQuerySchema)
	.output(PaymentHistoryResponseSchema)
	.handler(async ({ input, context }) => {
		const { limit = 10, starting_after } = input
		const { db, workspace, env } = context

		const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

		if (!ws?.stripeCustomerId) {
			return { payments: [], hasMore: false }
		}

		const stripe = getStripe(env)

		const charges = await stripe.charges.list({
			customer: ws.stripeCustomerId,
			limit: limit,
			starting_after: starting_after,
		})

		const payments = charges.data.map((charge) => ({
			id: charge.id,
			amount: charge.amount / 100, // Convert from cents
			currency: charge.currency.toUpperCase(),
			status: charge.status,
			description: charge.description,
			createdAt: new Date(charge.created * 1000).toISOString(),
			invoiceUrl: charge.receipt_url,
		}))

		return {
			payments,
			hasMore: charges.has_more,
		}
	})

// =============================================================================
// Router Export
// =============================================================================

export const billingRouter = {
	listPlans,
	createCheckout,
	createPortal,
	getStatus,
	getPaymentHistory,
}
