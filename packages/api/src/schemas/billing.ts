import { z } from 'zod'

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
export const PlanIdSchema = z.enum(['free', 'pro', 'team', 'enterprise'])

/**
 * Paid plan IDs that can be purchased through checkout.
 */
export const PaidPlanIdSchema = z.enum(['pro', 'team'])

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
			,
		maxMessagesPerMonth: z
			.number()
			.int()
			.min(-1)
			.describe('Maximum messages per month (-1 for unlimited)')
			,
	})
	

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
			,
		description: z
			.string()
			.min(1)
			.max(200)
			.describe('Brief description of the plan')
			,
		price: z
			.number()
			.min(0)
			.nullable()
			.describe('Monthly price in USD (null for custom pricing)')
			,
		priceId: z
			.string()
			.min(1)
			.max(100)
			.nullable()
			.describe('Stripe price ID for this plan')
			,
		features: PlanFeaturesSchema,
	})
	

/**
 * Response containing available plans and current plan.
 */
export const PlansResponseSchema = z
	.object({
		plans: z.array(PlanSchema).describe('List of all available billing plans'),
		currentPlanId: z.string().nullable().describe('Currently active plan ID for the workspace'),
	})
	

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
			,
		cancelUrl: z
			.string()
			.url()
			.max(2000)
			.optional()
			.describe('URL to redirect if checkout is cancelled')
			,
	})
	

/**
 * Response after creating a checkout session.
 */
export const CheckoutResponseSchema = z
	.object({
		url: z
			.string()
			.url()
			.describe('Stripe checkout session URL to redirect the user')
			,
		sessionId: z
			.string()
			.min(1)
			.max(255)
			.describe('Stripe checkout session ID')
			,
	})
	

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
			,
	})
	

// =============================================================================
// Billing Status Schemas
// =============================================================================

/**
 * Subscription status values.
 */
export const SubscriptionStatusSchema = z
	.enum(['active', 'canceled', 'past_due', 'trialing', 'none'])
	

/**
 * Usage statistics for the current billing period.
 */
export const BillingUsageSchema = z
	.object({
		agentsUsed: z.number().int().min(0).describe('Number of active agents'),
		agentsLimit: z
			.number()
			.int()
			.min(-1)
			.describe('Maximum agents allowed (-1 for unlimited)')
			,
		messagesUsed: z
			.number()
			.int()
			.min(0)
			.describe('Messages sent this billing period')
			,
		messagesLimit: z
			.number()
			.int()
			.min(-1)
			.describe('Maximum messages allowed (-1 for unlimited)')
			,
	})
	

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
			,
		status: SubscriptionStatusSchema.describe('Current subscription status'),
		currentPeriodEnd: z
			.string()
			.datetime()
			.nullable()
			.describe('When the current billing period ends')
			,
		cancelAtPeriodEnd: z
			.boolean()
			.describe('Whether subscription will cancel at period end')
			,
		usage: BillingUsageSchema,
	})
	

// =============================================================================
// Payment History Schemas
// =============================================================================

/**
 * Payment status values from Stripe.
 */
export const PaymentStatusSchema = z
	.enum(['succeeded', 'pending', 'failed', 'refunded', 'canceled'])
	

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
			,
		amount: z
			.number()
			.min(0)
			.describe('Amount in dollars (converted from cents)')
			,
		currency: z
			.string()
			.length(3)
			.toUpperCase()
			.describe('Currency code in uppercase')
			,
		status: z
			.string()
			.min(1)
			.max(50)
			.describe('Payment status from Stripe')
			,
		description: z
			.string()
			.max(500)
			.nullable()
			.describe('Payment description')
			,
		createdAt: z
			.string()
			.datetime()
			.describe('When the payment was created')
			,
		invoiceUrl: z
			.string()
			.url()
			.nullable()
			.describe('URL to view/download the receipt')
			,
	})
	

/**
 * Response containing payment history.
 */
export const PaymentHistoryResponseSchema = z
	.object({
		payments: z.array(PaymentHistoryItemSchema).describe('List of payment records'),
		hasMore: z
			.boolean()
			.describe('Whether more payments exist beyond this page')
			,
	})
	

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
			,
		starting_after: z
			.string()
			.min(1)
			.max(255)
			.optional()
			.describe('Cursor for pagination - charge ID to start after')
			,
	})
	
