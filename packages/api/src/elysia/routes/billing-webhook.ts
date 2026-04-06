/**
 * Billing Webhook Route
 *
 * Stripe webhook endpoint. Needs raw body access for signature verification.
 * All other billing routes are in the billing router.
 */

import { workspaces } from '@hare/db/schema'
import type { CloudflareEnv } from '@hare/types'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import Stripe from 'stripe'
import { cfContext } from '../context'

type PlanId = 'free' | 'pro' | 'team' | 'enterprise'

function isValidPlanId(value: string | null | undefined): value is PlanId {
	return value != null && ['free', 'pro', 'team', 'enterprise'].includes(value)
}

function getStripe(env: CloudflareEnv): Stripe {
	const secretKey = env.STRIPE_SECRET_KEY
	if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured')
	return new Stripe(secretKey, { typescript: true })
}

export const billingWebhookRoutes = new Elysia({
	prefix: '/billing-webhook',
	name: 'billing-webhook',
})
	.use(cfContext)
	.post('/webhook', async ({ cfEnv, db, request }) => {
		const webhookSecret = cfEnv.STRIPE_WEBHOOK_SECRET
		if (!webhookSecret) {
			return Response.json({ error: 'Webhook not configured' }, { status: 400 })
		}

		const stripe = getStripe(cfEnv)
		const signature = request.headers.get('stripe-signature')

		if (!signature) {
			return Response.json({ error: 'Missing signature' }, { status: 400 })
		}

		let event: Stripe.Event
		try {
			const body = await request.text()
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
		} catch (err) {
			// biome-ignore lint/suspicious/noConsole: error reporting
			console.error('Webhook signature verification failed:', err)
			return Response.json({ error: 'Invalid signature' }, { status: 400 })
		}

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
				// biome-ignore lint/suspicious/noConsole: server logging
				console.warn('Payment failed for invoice:', invoice.id)
				break
			}

			default:
				// biome-ignore lint/suspicious/noConsole: server logging
				console.log(`Unhandled event type: ${event.type}`)
		}

		return { received: true }
	})
