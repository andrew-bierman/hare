import { z } from '@hono/zod-openapi'

/**
 * Billing Schemas
 *
 * Zod schemas for billing-related API operations.
 * Includes plans, checkout, billing status, and payment history.
 */

// =============================================================================
// Plan IDs
// =============================================================================

/**
 * Valid plan IDs for billing.
 */
export const PlanIdSchema = z.enum(['free', 'pro', 'team', 'enterprise']).openapi('PlanId')

/**
 * Paid plan IDs that can be purchased through checkout.
 */
export const PaidPlanIdSchema = z.enum(['pro', 'team']).openapi('PaidPlanId')

// =============================================================================
// Plan Schemas
// =============================================================================

/**
 * Features included in a billing plan.
 * Uses -1 to represent unlimited.
 */
export const PlanFeaturesSchema = z
	.object({
		maxAgents: z
			.number()
			.int()
			.min(-1)
			.describe('Maximum number of agents allowed (-1 for unlimited)')
			.openapi({ example: 20 }),
		maxMessagesPerMonth: z
			.number()
			.int()
			.min(-1)
			.describe('Maximum messages per month (-1 for unlimited)')
			.openapi({ example: 50000 }),
	})
	.openapi('PlanFeatures')

/**
 * Full billing plan definition.
 */
export const PlanSchema = z
	.object({
		id: PlanIdSchema.describe('Unique plan identifier'),
		name: z
			.string()
			.min(1)
			.max(50)
			.describe('Display name of the plan')
			.openapi({ example: 'Pro' }),
		description: z
			.string()
			.min(1)
			.max(200)
			.describe('Brief description of the plan')
			.openapi({ example: 'For growing teams' }),
		price: z
			.number()
			.min(0)
			.nullable()
			.describe('Monthly price in USD (null for custom pricing)')
			.openapi({ example: 29 }),
		priceId: z
			.string()
			.min(1)
			.max(100)
			.nullable()
			.describe('Stripe price ID for this plan')
			.openapi({ example: 'price_pro_monthly' }),
		features: PlanFeaturesSchema,
	})
	.openapi('Plan')

/**
 * Response containing available plans and current plan.
 */
export const PlansResponseSchema = z
	.object({
		plans: z.array(PlanSchema).describe('List of all available billing plans'),
		currentPlanId: z.string().nullable().describe('Currently active plan ID for the workspace'),
	})
	.openapi('PlansResponse')

// =============================================================================
// Checkout Schemas
// =============================================================================

/**
 * Request to create a Stripe checkout session.
 */
export const CheckoutRequestSchema = z
	.object({
		planId: PaidPlanIdSchema.describe('Plan to subscribe to'),
		successUrl: z
			.string()
			.url()
			.max(2000)
			.optional()
			.describe('URL to redirect after successful checkout')
			.openapi({ example: 'https://app.example.com/billing?success=true' }),
		cancelUrl: z
			.string()
			.url()
			.max(2000)
			.optional()
			.describe('URL to redirect if checkout is cancelled')
			.openapi({ example: 'https://app.example.com/billing?canceled=true' }),
	})
	.openapi('CheckoutRequest')

/**
 * Response after creating a checkout session.
 */
export const CheckoutResponseSchema = z
	.object({
		url: z
			.string()
			.url()
			.describe('Stripe checkout session URL to redirect the user')
			.openapi({ example: 'https://checkout.stripe.com/c/pay/cs_test_...' }),
		sessionId: z
			.string()
			.min(1)
			.max(255)
			.describe('Stripe checkout session ID')
			.openapi({ example: 'cs_test_a1b2c3d4e5f6' }),
	})
	.openapi('CheckoutResponse')

// =============================================================================
// Portal Schemas
// =============================================================================

/**
 * Response after creating a customer portal session.
 */
export const PortalResponseSchema = z
	.object({
		url: z
			.string()
			.url()
			.describe('Stripe customer portal URL')
			.openapi({ example: 'https://billing.stripe.com/p/session/...' }),
	})
	.openapi('PortalResponse')

// =============================================================================
// Billing Status Schemas
// =============================================================================

/**
 * Subscription status values.
 */
export const SubscriptionStatusSchema = z
	.enum(['active', 'canceled', 'past_due', 'trialing', 'none'])
	.openapi('SubscriptionStatus')

/**
 * Usage statistics for the current billing period.
 */
export const BillingUsageSchema = z
	.object({
		agentsUsed: z.number().int().min(0).describe('Number of active agents').openapi({ example: 5 }),
		agentsLimit: z
			.number()
			.int()
			.min(-1)
			.describe('Maximum agents allowed (-1 for unlimited)')
			.openapi({ example: 20 }),
		messagesUsed: z
			.number()
			.int()
			.min(0)
			.describe('Messages sent this billing period')
			.openapi({ example: 12500 }),
		messagesLimit: z
			.number()
			.int()
			.min(-1)
			.describe('Maximum messages allowed (-1 for unlimited)')
			.openapi({ example: 50000 }),
	})
	.openapi('BillingUsage')

/**
 * Current billing status for a workspace.
 */
export const BillingStatusSchema = z
	.object({
		planId: PlanIdSchema.describe('Current plan ID'),
		planName: z
			.string()
			.min(1)
			.max(50)
			.describe('Display name of the current plan')
			.openapi({ example: 'Pro' }),
		status: SubscriptionStatusSchema.describe('Current subscription status'),
		currentPeriodEnd: z
			.string()
			.datetime()
			.nullable()
			.describe('When the current billing period ends')
			.openapi({ example: '2025-02-01T00:00:00Z' }),
		cancelAtPeriodEnd: z
			.boolean()
			.describe('Whether subscription will cancel at period end')
			.openapi({ example: false }),
		usage: BillingUsageSchema,
	})
	.openapi('BillingStatus')

// =============================================================================
// Payment History Schemas
// =============================================================================

/**
 * Payment status values from Stripe.
 */
export const PaymentStatusSchema = z
	.enum(['succeeded', 'pending', 'failed', 'refunded', 'canceled'])
	.openapi('PaymentStatus')

/**
 * Single payment/charge record.
 */
export const PaymentHistoryItemSchema = z
	.object({
		id: z
			.string()
			.min(1)
			.max(255)
			.describe('Stripe charge ID')
			.openapi({ example: 'ch_1234567890abcdef' }),
		amount: z
			.number()
			.min(0)
			.describe('Amount in dollars (converted from cents)')
			.openapi({ example: 29.0 }),
		currency: z
			.string()
			.length(3)
			.toUpperCase()
			.describe('Currency code in uppercase')
			.openapi({ example: 'USD' }),
		status: z
			.string()
			.min(1)
			.max(50)
			.describe('Payment status from Stripe')
			.openapi({ example: 'succeeded' }),
		description: z
			.string()
			.max(500)
			.nullable()
			.describe('Payment description')
			.openapi({ example: 'Subscription to Pro plan' }),
		createdAt: z
			.string()
			.datetime()
			.describe('When the payment was created')
			.openapi({ example: '2025-01-01T00:00:00Z' }),
		invoiceUrl: z
			.string()
			.url()
			.nullable()
			.describe('URL to view/download the receipt')
			.openapi({ example: 'https://pay.stripe.com/receipts/...' }),
	})
	.openapi('PaymentHistoryItem')

/**
 * Response containing payment history.
 */
export const PaymentHistoryResponseSchema = z
	.object({
		payments: z.array(PaymentHistoryItemSchema).describe('List of payment records'),
		hasMore: z
			.boolean()
			.describe('Whether more payments exist beyond this page')
			.openapi({ example: false }),
	})
	.openapi('PaymentHistoryResponse')

/**
 * Query parameters for payment history.
 */
export const PaymentHistoryQuerySchema = z
	.object({
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.default(10)
			.optional()
			.describe('Number of payments to return')
			.openapi({ example: 10 }),
		starting_after: z
			.string()
			.min(1)
			.max(255)
			.optional()
			.describe('Cursor for pagination - charge ID to start after')
			.openapi({ example: 'ch_1234567890abcdef' }),
	})
	.openapi('PaymentHistoryQuery')
