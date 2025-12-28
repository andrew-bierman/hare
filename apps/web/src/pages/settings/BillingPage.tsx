'use client'

import { useNavigate, useSearch } from '@tanstack/react-router'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import { Progress } from '@workspace/ui/components/progress'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Check, CreditCard, ExternalLink, Sparkles, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from 'web-app/app/providers/workspace-provider'
import {
	useBillingStatus,
	useCreateCheckout,
	useCreatePortal,
	usePlans,
} from 'web-app/entities/billing'

interface BillingPageProps {
	searchParams: {
		success?: string
		canceled?: string
	}
}

export function BillingPage({ searchParams }: BillingPageProps) {
	const navigate = useNavigate()
	const { activeWorkspace } = useWorkspace()
	const [isRedirecting, setIsRedirecting] = useState(false)

	const { data: plansData, isLoading: plansLoading } = usePlans(activeWorkspace?.id)
	const { data: statusData, isLoading: statusLoading } = useBillingStatus(activeWorkspace?.id)
	const createCheckout = useCreateCheckout()
	const createPortal = useCreatePortal()

	// Handle success/cancel redirects from Stripe
	useEffect(() => {
		if (searchParams.success === 'true') {
			toast.success('Subscription updated successfully!')
			navigate({ to: '/dashboard/settings/billing', replace: true })
		} else if (searchParams.canceled === 'true') {
			toast.info('Checkout was canceled')
			navigate({ to: '/dashboard/settings/billing', replace: true })
		}
	}, [searchParams.success, searchParams.canceled, navigate])

	const handleUpgrade = async (planId: 'pro' | 'team') => {
		if (!activeWorkspace) return
		setIsRedirecting(true)
		try {
			const result = await createCheckout.mutateAsync({
				workspaceId: activeWorkspace.id,
				planId,
			})
			window.location.href = result.url
		} catch {
			toast.error('Failed to start checkout')
			setIsRedirecting(false)
		}
	}

	const handleManageBilling = async () => {
		if (!activeWorkspace) return
		setIsRedirecting(true)
		try {
			const result = await createPortal.mutateAsync({
				workspaceId: activeWorkspace.id,
			})
			window.location.href = result.url
		} catch {
			toast.error('Failed to open billing portal')
			setIsRedirecting(false)
		}
	}

	const isLoading = plansLoading || statusLoading
	const currentPlanId = statusData?.planId || 'free'
	const isPaidPlan = currentPlanId !== 'free'

	if (isLoading) {
		return (
			<div className="flex-1 space-y-6 p-8 pt-6">
				<Skeleton className="h-9 w-32" />
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					<Skeleton className="h-80" />
					<Skeleton className="h-80" />
					<Skeleton className="h-80" />
					<Skeleton className="h-80" />
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Billing</h2>
					<p className="text-muted-foreground">Manage your subscription and billing information</p>
				</div>
				{isPaidPlan && (
					<Button variant="outline" onClick={handleManageBilling} disabled={isRedirecting}>
						<CreditCard className="mr-2 h-4 w-4" />
						Manage Billing
					</Button>
				)}
			</div>

			{/* Current Plan Status */}
			{statusData && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									Current Plan
									<Badge variant={isPaidPlan ? 'default' : 'secondary'}>
										{statusData.planName}
									</Badge>
								</CardTitle>
								<CardDescription>
									{statusData.status === 'active'
										? 'Your subscription is active'
										: statusData.status === 'canceled'
											? 'Your subscription has been canceled'
											: statusData.status === 'past_due'
												? 'Payment is past due'
												: 'No active subscription'}
								</CardDescription>
							</div>
							{statusData.currentPeriodEnd && (
								<div className="text-sm text-muted-foreground">
									{statusData.cancelAtPeriodEnd ? 'Cancels on ' : 'Renews on '}
									{new Date(statusData.currentPeriodEnd).toLocaleDateString()}
								</div>
							)}
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-2">
							{/* Agents Usage */}
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span>Agents</span>
									<span className="text-muted-foreground">
										{statusData.usage.agentsUsed} /{' '}
										{statusData.usage.agentsLimit === -1
											? 'Unlimited'
											: statusData.usage.agentsLimit}
									</span>
								</div>
								<Progress
									value={
										statusData.usage.agentsLimit === -1
											? 0
											: (statusData.usage.agentsUsed / statusData.usage.agentsLimit) * 100
									}
									className="h-2"
								/>
							</div>
							{/* Messages Usage */}
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span>Messages this month</span>
									<span className="text-muted-foreground">
										{statusData.usage.messagesUsed.toLocaleString()} /{' '}
										{statusData.usage.messagesLimit === -1
											? 'Unlimited'
											: statusData.usage.messagesLimit.toLocaleString()}
									</span>
								</div>
								<Progress
									value={
										statusData.usage.messagesLimit === -1
											? 0
											: (statusData.usage.messagesUsed / statusData.usage.messagesLimit) * 100
									}
									className="h-2"
								/>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Pricing Plans */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				{plansData?.plans.map((plan) => {
					const isCurrentPlan = plan.id === currentPlanId
					const isPopular = plan.id === 'pro'

					return (
						<Card
							key={plan.id}
							className={`relative ${isCurrentPlan ? 'border-primary' : ''} ${isPopular ? 'border-2 border-primary shadow-lg' : ''}`}
						>
							{isPopular && (
								<div className="absolute -top-3 left-1/2 -translate-x-1/2">
									<Badge className="flex items-center gap-1">
										<Sparkles className="h-3 w-3" />
										Popular
									</Badge>
								</div>
							)}
							<CardHeader className="pt-8">
								<CardTitle className="flex items-center gap-2">
									{plan.name}
									{isCurrentPlan && (
										<Badge variant="outline" className="ml-auto">
											Current
										</Badge>
									)}
								</CardTitle>
								<CardDescription>{plan.description}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-baseline gap-1">
									{plan.price !== null ? (
										<>
											<span className="text-4xl font-bold">${plan.price}</span>
											<span className="text-muted-foreground">/month</span>
										</>
									) : (
										<span className="text-2xl font-bold">Custom</span>
									)}
								</div>
								<Separator />
								<ul className="space-y-2 text-sm">
									<li className="flex items-center gap-2">
										<Check className="h-4 w-4 text-green-500" />
										{plan.features.maxAgents === -1
											? 'Unlimited agents'
											: `${plan.features.maxAgents} agents`}
									</li>
									<li className="flex items-center gap-2">
										<Check className="h-4 w-4 text-green-500" />
										{plan.features.maxMessagesPerMonth === -1
											? 'Unlimited messages'
											: `${plan.features.maxMessagesPerMonth.toLocaleString()} messages/mo`}
									</li>
									{plan.id !== 'free' && (
										<li className="flex items-center gap-2">
											<Check className="h-4 w-4 text-green-500" />
											Priority support
										</li>
									)}
									{(plan.id === 'team' || plan.id === 'enterprise') && (
										<li className="flex items-center gap-2">
											<Check className="h-4 w-4 text-green-500" />
											Team collaboration
										</li>
									)}
									{plan.id === 'enterprise' && (
										<>
											<li className="flex items-center gap-2">
												<Check className="h-4 w-4 text-green-500" />
												SSO / SAML
											</li>
											<li className="flex items-center gap-2">
												<Check className="h-4 w-4 text-green-500" />
												Dedicated support
											</li>
										</>
									)}
								</ul>
							</CardContent>
							<CardFooter>
								{plan.id === 'free' ? (
									<Button variant="outline" className="w-full" disabled>
										{isCurrentPlan ? 'Current Plan' : 'Free Forever'}
									</Button>
								) : plan.id === 'enterprise' ? (
									<Button variant="outline" className="w-full" asChild>
										<a href="mailto:sales@hare.ai">
											Contact Sales
											<ExternalLink className="ml-2 h-4 w-4" />
										</a>
									</Button>
								) : isCurrentPlan ? (
									<Button
										variant="outline"
										className="w-full"
										onClick={handleManageBilling}
										disabled={isRedirecting}
									>
										Manage Subscription
									</Button>
								) : (
									<Button
										className="w-full"
										onClick={() => handleUpgrade(plan.id as 'pro' | 'team')}
										disabled={isRedirecting}
									>
										<Zap className="mr-2 h-4 w-4" />
										{isPaidPlan ? 'Switch Plan' : 'Upgrade'}
									</Button>
								)}
							</CardFooter>
						</Card>
					)
				})}
			</div>

			{/* FAQ or Additional Info */}
			<Card>
				<CardHeader>
					<CardTitle>Frequently Asked Questions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<h4 className="font-medium">Can I change plans at any time?</h4>
						<p className="text-sm text-muted-foreground">
							Yes, you can upgrade or downgrade your plan at any time. Changes take effect
							immediately.
						</p>
					</div>
					<Separator />
					<div>
						<h4 className="font-medium">What happens if I exceed my limits?</h4>
						<p className="text-sm text-muted-foreground">
							You will receive a notification when approaching your limits. Exceeding limits may
							temporarily restrict new agent creation or message sending until you upgrade or the
							next billing cycle.
						</p>
					</div>
					<Separator />
					<div>
						<h4 className="font-medium">How do I cancel my subscription?</h4>
						<p className="text-sm text-muted-foreground">
							You can cancel at any time through the billing portal. Your subscription will remain
							active until the end of your billing period.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
