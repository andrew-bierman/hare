/**
 * Billing Webhook Route
 *
 * Stripe webhook endpoint. Needs raw body access for signature verification.
 * Handles checkout.session.completed to credit purchased tokens to workspace.
 */

import { logger } from '@hare/config'
import type { CloudflareEnv } from '@hare/types'
import { Elysia } from 'elysia'
import Stripe from 'stripe'
import { addCredits } from '../../services/credits'
import { cfContext } from '../context'

function getStripe(env: CloudflareEnv): Stripe {
	const secretKey = env.STRIPE_SECRET_KEY
	if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured')
	return new Stripe(secretKey, { typescript: true })
}

export const billingWebhookRoutes = new Elysia({
	prefix: '/billing',
	name: 'billing-webhook',
})
	.use(cfContext)
	.post('/webhook', async ({ cfEnv, db, request }) => {
		const webhookSecret = cfEnv.STRIPE_WEBHOOK_SECRET
		if (!webhookSecret || !cfEnv.STRIPE_SECRET_KEY) {
			logger.error('STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY is not configured')
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
			event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
		} catch (err) {
			logger.error('Webhook signature verification failed:', err)
			return Response.json({ error: 'Invalid signature' }, { status: 400 })
		}

		if (event.type === 'checkout.session.completed') {
			const session = event.data.object as Stripe.Checkout.Session

			// Only credit on confirmed payment
			if (session.payment_status !== 'paid') {
				return { received: true }
			}

			const workspaceId = session.metadata?.workspaceId
			const creditsAmount = session.metadata?.creditsAmount

			if (workspaceId && creditsAmount) {
				const amount = Number.parseInt(creditsAmount, 10)
				if (amount > 0) {
					await addCredits({ db, workspaceId, amount })
					logger.info(
						`[Billing] Added ${amount} token credits to workspace ${workspaceId} (session ${session.id})`,
					)
				}
			}
		}

		return { received: true }
	})
