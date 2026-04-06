/**
 * Billing Webhook Route (Hono)
 *
 * This file only contains the Stripe webhook endpoint which needs raw body access
 * for signature verification. All other billing routes have been migrated to oRPC.
 *
 * @see packages/api/src/orpc/routers/billing.ts for authenticated billing routes
 */

import { logger } from '@hare/config'
import { workspaces } from '@hare/db/schema'
import type { CloudflareEnv, HonoEnv } from '@hare/types'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { getDb } from '../db'
import { ErrorSchema } from '../schemas'

// =============================================================================
// Types
// =============================================================================

type PlanId = 'free' | 'pro' | 'team' | 'enterprise'

function isValidPlanId(value: string | null | undefined): value is PlanId {
	return (
		value !== null && value !== undefined && ['free', 'pro', 'team', 'enterprise'].includes(value)
	)
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStripe(env: CloudflareEnv): Stripe {
	const secretKey = env.STRIPE_SECRET_KEY
	if (!secretKey) {
		throw new Error('STRIPE_SECRET_KEY is not configured')
	}
	return new Stripe(secretKey, { typescript: true })
}

// =============================================================================
// Route Definition
// =============================================================================

const webhookRoute = createRoute({
	method: 'post',
	path: '/webhook',
	tags: ['Billing'],
	summary: 'Handle Stripe webhooks',
	description: 'Webhook endpoint for Stripe events. Requires raw body for signature verification.',
	responses: {
		200: {
			description: 'Webhook processed',
			content: {
				'application/json': {
					schema: z.object({ received: z.boolean() }),
				},
			},
		},
		400: {
			description: 'Invalid webhook',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

// =============================================================================
// App Setup
// =============================================================================

const app = new OpenAPIHono<HonoEnv>()

// Webhook handler (no auth - Stripe signs requests)
app.openapi(webhookRoute, async (c) => {
	const env = c.env as CloudflareEnv
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET

	if (!webhookSecret) {
		logger.error('STRIPE_WEBHOOK_SECRET is not configured')
		return c.json({ error: 'Webhook not configured' }, 400)
	}

	const stripe = getStripe(env)
	const signature = c.req.header('stripe-signature')

	if (!signature) {
		return c.json({ error: 'Missing signature' }, 400)
	}

	let event: Stripe.Event

	try {
		const body = await c.req.text()
		event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
	} catch (err) {
		logger.error('Webhook signature verification failed:', err)
		return c.json({ error: 'Invalid signature' }, 400)
	}

	const db = getDb(c)

	// Handle the event
	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session
			const workspaceId = session.metadata?.workspaceId
			const rawPlanId = session.metadata?.planId

			if (workspaceId && isValidPlanId(rawPlanId) && session.subscription) {
				await db
					.update(workspaces)
					.set({
						stripeSubscriptionId: session.subscription as string,
						planId: rawPlanId,
						currentPeriodEnd: session.expires_at ? new Date(session.expires_at * 1000) : null,
						updatedAt: new Date(),
					})
					.where(eq(workspaces.id, workspaceId))
			}
			break
		}

		case 'customer.subscription.updated': {
			const subscription = event.data.object as Stripe.Subscription & {
				current_period_end: number
			}
			const workspaceId = subscription.metadata?.workspaceId

			if (workspaceId) {
				const rawPlanId = subscription.metadata?.planId
				const planId: PlanId = isValidPlanId(rawPlanId) ? rawPlanId : 'pro'
				await db
					.update(workspaces)
					.set({
						stripeSubscriptionId: subscription.id,
						planId,
						currentPeriodEnd: new Date(subscription.current_period_end * 1000),
						updatedAt: new Date(),
					})
					.where(eq(workspaces.id, workspaceId))
			}
			break
		}

		case 'customer.subscription.deleted': {
			const subscription = event.data.object as Stripe.Subscription
			const workspaceId = subscription.metadata?.workspaceId

			if (workspaceId) {
				await db
					.update(workspaces)
					.set({
						stripeSubscriptionId: null,
						planId: 'free',
						currentPeriodEnd: null,
						updatedAt: new Date(),
					})
					.where(eq(workspaces.id, workspaceId))
			}
			break
		}

		case 'invoice.payment_failed': {
			const invoice = event.data.object as Stripe.Invoice
			logger.warn('Payment failed for invoice:', invoice.id)
			break
		}

		default:
			logger.info(`Unhandled event type: ${event.type}`)
	}

	return c.json({ received: true }, 200)
})

export default app
