/**
 * Billing Webhook Route (Hono)
 *
 * Handles Stripe webhook for credit purchases.
 * When a checkout.session.completed event arrives with creditsAmount metadata,
 * adds those tokens to the workspace balance.
 */

import { logger } from '@hare/config'
import type { CloudflareEnv, HonoEnv } from '@hare/types'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import Stripe from 'stripe'
import { getDb } from '../db'
import { ErrorSchema } from '../schemas'
import { addCredits } from '../services/credits'

const webhookRoute = createRoute({
	method: 'post',
	path: '/webhook',
	tags: ['Billing'],
	summary: 'Handle Stripe webhooks',
	description: 'Adds purchased token credits to workspace balance.',
	responses: {
		200: {
			description: 'Webhook processed',
			content: { 'application/json': { schema: z.object({ received: z.boolean() }) } },
		},
		400: {
			description: 'Invalid webhook',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

const app = new OpenAPIHono<HonoEnv>()

app.openapi(webhookRoute, async (c) => {
	const env = c.env as CloudflareEnv
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET

	if (!webhookSecret || !env.STRIPE_SECRET_KEY) {
		logger.error('STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY is not configured')
		return c.json({ error: 'Webhook not configured' }, 400)
	}

	const stripe = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true })
	const signature = c.req.header('stripe-signature')

	if (!signature) {
		return c.json({ error: 'Missing signature' }, 400)
	}

	let event: Stripe.Event

	try {
		const body = await c.req.text()
		event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
	} catch (err) {
		logger.error('Webhook signature verification failed:', err)
		return c.json({ error: 'Invalid signature' }, 400)
	}

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as Stripe.Checkout.Session

		// Only credit on confirmed payment (not free trials or incomplete sessions)
		if (session.payment_status !== 'paid') {
			return c.json({ received: true }, 200)
		}

		const workspaceId = session.metadata?.workspaceId
		const creditsAmount = session.metadata?.creditsAmount

		if (workspaceId && creditsAmount) {
			const db = getDb(c)
			const amount = Number.parseInt(creditsAmount, 10)

			if (amount > 0) {
				await addCredits({ db, workspaceId, amount })
				logger.info(`[Billing] Added ${amount} token credits to workspace ${workspaceId} (session ${session.id})`)
			}
		}
	}

	return c.json({ received: true }, 200)
})

export default app
