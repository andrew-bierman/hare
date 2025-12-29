import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { workspaces } from '@hare/db'
import { getDb } from '../db'
import { commonResponses } from '../helpers'
import { authMiddleware, workspaceMiddleware } from '../middleware'
import { ErrorSchema } from '../schemas'
import { getBillingUsage } from '../services/billing-usage'
import type { HonoEnv, WorkspaceEnv } from '@hare/types'

// =============================================================================
// Pricing Plans
// =============================================================================

export const BILLING_PLANS = {
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

export type PlanId = keyof typeof BILLING_PLANS

// =============================================================================
// Schemas
// =============================================================================

const PlanFeaturesSchema = z.object({
	maxAgents: z.number(),
	maxMessagesPerMonth: z.number(),
})

const PlanSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	price: z.number().nullable(),
	priceId: z.string().nullable(),
	features: PlanFeaturesSchema,
})

const PlansResponseSchema = z.object({
	plans: z.array(PlanSchema),
	currentPlanId: z.string().nullable(),
})

const CheckoutRequestSchema = z.object({
	planId: z.enum(['pro', 'team']),
	successUrl: z.string().url().optional(),
	cancelUrl: z.string().url().optional(),
})

const CheckoutResponseSchema = z.object({
	url: z.string().url(),
	sessionId: z.string(),
})

const PortalResponseSchema = z.object({
	url: z.string().url(),
})

const BillingStatusSchema = z.object({
	planId: z.string(),
	planName: z.string(),
	status: z.enum(['active', 'canceled', 'past_due', 'trialing', 'none']),
	currentPeriodEnd: z.string().nullable(),
	cancelAtPeriodEnd: z.boolean(),
	usage: z.object({
		agentsUsed: z.number(),
		agentsLimit: z.number(),
		messagesUsed: z.number(),
		messagesLimit: z.number(),
	}),
})

const PaymentHistoryItemSchema = z.object({
	id: z.string(),
	amount: z.number(),
	currency: z.string(),
	status: z.string(),
	description: z.string().nullable(),
	createdAt: z.string(),
	invoiceUrl: z.string().nullable(),
})

const PaymentHistoryResponseSchema = z.object({
	payments: z.array(PaymentHistoryItemSchema),
	hasMore: z.boolean(),
})

// =============================================================================
// Helper Functions
// =============================================================================

function getStripe(env: CloudflareEnv): Stripe {
	const secretKey = env.STRIPE_SECRET_KEY
	if (!secretKey) {
		throw new Error('STRIPE_SECRET_KEY is not configured')
	}
	return new Stripe(secretKey, {
		// Use the latest API version supported by the SDK
		typescript: true,
	})
}

function getAppUrl(env: CloudflareEnv): string {
	// In production, use the configured app URL
	// Fall back to localhost for development
	return env.APP_URL || 'http://localhost:3000'
}

// =============================================================================
// Route Definitions
// =============================================================================

const listPlansRoute = createRoute({
	method: 'get',
	path: '/plans',
	tags: ['Billing'],
	summary: 'List available billing plans',
	description: 'Get a list of all available billing plans and their features',
	responses: {
		200: {
			description: 'List of billing plans',
			content: {
				'application/json': {
					schema: PlansResponseSchema,
				},
			},
		},
		...commonResponses,
	},
})

const createCheckoutRoute = createRoute({
	method: 'post',
	path: '/checkout',
	tags: ['Billing'],
	summary: 'Create checkout session',
	description: 'Create a Stripe checkout session for upgrading to a paid plan',
	request: {
		body: {
			content: {
				'application/json': {
					schema: CheckoutRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Checkout session created',
			content: {
				'application/json': {
					schema: CheckoutResponseSchema,
				},
			},
		},
		400: {
			description: 'Invalid plan or request',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const createPortalRoute = createRoute({
	method: 'post',
	path: '/portal',
	tags: ['Billing'],
	summary: 'Create customer portal session',
	description: 'Create a Stripe customer portal session for managing subscription',
	responses: {
		200: {
			description: 'Portal session created',
			content: {
				'application/json': {
					schema: PortalResponseSchema,
				},
			},
		},
		400: {
			description: 'No active subscription',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const getBillingStatusRoute = createRoute({
	method: 'get',
	path: '/status',
	tags: ['Billing'],
	summary: 'Get billing status',
	description: 'Get current billing status, plan, and usage for the workspace',
	responses: {
		200: {
			description: 'Billing status',
			content: {
				'application/json': {
					schema: BillingStatusSchema,
				},
			},
		},
		...commonResponses,
	},
})

const getPaymentHistoryRoute = createRoute({
	method: 'get',
	path: '/history',
	tags: ['Billing'],
	summary: 'Get payment history',
	description: 'Get payment history from Stripe for the workspace',
	request: {
		query: z.object({
			limit: z.coerce.number().min(1).max(100).default(10).optional(),
			starting_after: z.string().optional(),
		}),
	},
	responses: {
		200: {
			description: 'Payment history',
			content: {
				'application/json': {
					schema: PaymentHistoryResponseSchema,
				},
			},
		},
		...commonResponses,
	},
})

// =============================================================================
// Webhook Route (No auth required)
// =============================================================================

const webhookRoute = createRoute({
	method: 'post',
	path: '/webhook',
	tags: ['Billing'],
	summary: 'Handle Stripe webhooks',
	description: 'Webhook endpoint for Stripe events',
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

// Main billing app with auth
const billingApp = new OpenAPIHono<WorkspaceEnv>()
billingApp.use('*', authMiddleware)
billingApp.use('*', workspaceMiddleware)

// Webhook app without auth (Stripe signs requests)
const webhookApp = new OpenAPIHono<HonoEnv>()

// =============================================================================
// Route Handlers
// =============================================================================

billingApp.openapi(listPlansRoute, async (c) => {
	const workspace = c.get('workspace')
	const db = getDb(c)

	// Get current workspace to check plan
	const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

	const plans = Object.values(BILLING_PLANS).map((plan) => ({
		id: plan.id,
		name: plan.name,
		description: plan.description,
		price: plan.price,
		priceId: plan.priceId,
		features: {
			maxAgents: plan.features.maxAgents,
			maxMessagesPerMonth: plan.features.maxMessagesPerMonth,
		},
	}))

	return c.json(
		{
			plans,
			currentPlanId: ws?.planId || 'free',
		},
		200,
	)
})

billingApp.openapi(createCheckoutRoute, async (c) => {
	const { planId, successUrl, cancelUrl } = c.req.valid('json')
	const workspace = c.get('workspace')
	const user = c.get('user')
	const db = getDb(c)
	const env = c.env as CloudflareEnv

	const plan = BILLING_PLANS[planId]
	if (!plan || !plan.priceId) {
		return c.json({ error: 'Invalid plan selected' }, 400)
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
		return c.json({ error: 'Failed to create checkout session' }, 400)
	}

	return c.json(
		{
			url: session.url,
			sessionId: session.id,
		},
		200,
	)
})

billingApp.openapi(createPortalRoute, async (c) => {
	const workspace = c.get('workspace')
	const db = getDb(c)
	const env = c.env as CloudflareEnv

	const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

	if (!ws?.stripeCustomerId) {
		return c.json({ error: 'No billing account found. Please upgrade to a paid plan first.' }, 400)
	}

	const stripe = getStripe(env)
	const appUrl = getAppUrl(env)

	const session = await stripe.billingPortal.sessions.create({
		customer: ws.stripeCustomerId,
		return_url: `${appUrl}/dashboard/settings/billing`,
	})

	return c.json({ url: session.url }, 200)
})

billingApp.openapi(getBillingStatusRoute, async (c) => {
	const workspace = c.get('workspace')
	const db = getDb(c)
	const env = c.env as CloudflareEnv

	const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

	const planId = (ws?.planId as PlanId) || 'free'
	const plan = BILLING_PLANS[planId] || BILLING_PLANS.free

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

	return c.json(
		{
			planId,
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
		},
		200,
	)
})

billingApp.openapi(getPaymentHistoryRoute, async (c) => {
	const { limit = 10, starting_after } = c.req.valid('query')
	const workspace = c.get('workspace')
	const db = getDb(c)
	const env = c.env as CloudflareEnv

	const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id))

	if (!ws?.stripeCustomerId) {
		return c.json({ payments: [], hasMore: false }, 200)
	}

	const stripe = getStripe(env)

	const charges = await stripe.charges.list({
		customer: ws.stripeCustomerId,
		limit: limit as number,
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

	return c.json(
		{
			payments,
			hasMore: charges.has_more,
		},
		200,
	)
})

// Webhook handler (no auth)
webhookApp.openapi(webhookRoute, async (c) => {
	const env = c.env as CloudflareEnv
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET

	if (!webhookSecret) {
		console.error('STRIPE_WEBHOOK_SECRET is not configured')
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
		console.error('Webhook signature verification failed:', err)
		return c.json({ error: 'Invalid signature' }, 400)
	}

	const db = getDb(c)

	// Handle the event
	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session
			const workspaceId = session.metadata?.workspaceId
			const planId = session.metadata?.planId

			if (workspaceId && planId && session.subscription) {
				await db
					.update(workspaces)
					.set({
						stripeSubscriptionId: session.subscription as string,
						planId,
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
				const planId = subscription.metadata?.planId || 'pro'
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
			// Could send notification to user about failed payment
			console.warn('Payment failed for invoice:', invoice.id)
			break
		}

		default:
			// Unhandled event type
			console.log(`Unhandled event type: ${event.type}`)
	}

	return c.json({ received: true }, 200)
})

// Combine apps - webhook route doesn't need auth
const app = new OpenAPIHono<HonoEnv>()
app.route('/', webhookApp)
app.route('/', billingApp)

export default app
