'use client'

import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@hare/ui/components/card'
import { Progress } from '@hare/ui/components/progress'
import { Separator } from '@hare/ui/components/separator'
import { Skeleton } from '@hare/ui/components/skeleton'
import { useNavigate } from '@tanstack/react-router'
import { Coins, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from '../../app/providers'
import { useBuyCreditsMutation, useCreditsStatusQuery } from '../../shared/api/hooks'

export interface BillingPageProps {
	searchParams?: {
		credits?: string
	}
}

function formatTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
	return n.toString()
}

export function BillingPage({ searchParams }: BillingPageProps) {
	const navigate = useNavigate()
	const { activeWorkspace } = useWorkspace()
	const [isRedirecting, setIsRedirecting] = useState(false)

	const { data, isLoading } = useCreditsStatusQuery(!!activeWorkspace)
	const buyCredits = useBuyCreditsMutation()

	useEffect(() => {
		if (searchParams?.credits === 'success') {
			toast.success('Credits added to your account!')
			navigate({
				to: '/dashboard/settings/billing',
				search: { credits: undefined },
				replace: true,
			})
		} else if (searchParams?.credits === 'canceled') {
			toast.info('Purchase was canceled')
			navigate({
				to: '/dashboard/settings/billing',
				search: { credits: undefined },
				replace: true,
			})
		}
	}, [searchParams?.credits, navigate])

	const handleBuyCredits = async (packId: string) => {
		if (!activeWorkspace) return
		setIsRedirecting(true)
		try {
			const result = await buyCredits.mutateAsync({ packId })
			window.location.href = result.url
		} catch {
			toast.error('Failed to start checkout')
			setIsRedirecting(false)
		}
	}

	if (isLoading) {
		return (
			<div className="flex-1 space-y-6 p-8 pt-6">
				<Skeleton className="h-9 w-32" />
				<Skeleton className="h-48" />
				<div className="grid gap-4 md:grid-cols-3">
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
				</div>
			</div>
		)
	}

	const balance = data?.creditsBalance ?? 0
	const freeMonthly = data?.freeMonthlyTokens ?? 0
	const balancePercent = freeMonthly > 0 ? Math.min((balance / freeMonthly) * 100, 100) : 0

	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">Billing</h2>
				<p className="text-muted-foreground">
					Usage-based pricing. You get {formatTokens(freeMonthly)} free tokens every month.
				</p>
			</div>

			{/* Token Balance */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Coins className="h-5 w-5" />
						Token Balance
						<Badge variant={balance > 0 ? 'default' : 'destructive'} className="ml-2">
							{formatTokens(balance)} tokens
						</Badge>
					</CardTitle>
					<CardDescription>
						1 token = 1 input or output token used by your agents. Free allotment resets monthly.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span>Balance</span>
							<span className="text-muted-foreground">
								{formatTokens(balance)} tokens remaining
							</span>
						</div>
						<Progress value={balancePercent} className="h-3" />
					</div>

					<Separator />

					<div className="grid gap-4 md:grid-cols-3 text-sm">
						<div>
							<span className="text-muted-foreground">Messages this month</span>
							<p className="text-lg font-semibold">
								{data?.usage.messagesUsed.toLocaleString() ?? 0}
							</p>
						</div>
						<div>
							<span className="text-muted-foreground">Tokens consumed</span>
							<p className="text-lg font-semibold">{formatTokens(data?.usage.totalTokens ?? 0)}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Active agents</span>
							<p className="text-lg font-semibold">{data?.usage.agentsUsed ?? 0}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Buy Credits */}
			<div>
				<h3 className="text-xl font-semibold mb-4">Buy Token Credits</h3>
				<div className="grid gap-4 md:grid-cols-3">
					{data?.creditPacks.map((pack) => (
						<Card key={pack.id}>
							<CardHeader>
								<CardTitle>{pack.label}</CardTitle>
								<CardDescription>
									${((pack.price / pack.credits) * 1000).toFixed(2)} per 1K tokens
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex items-baseline gap-1">
									<span className="text-3xl font-bold">${pack.price}</span>
								</div>
							</CardContent>
							<CardFooter>
								<Button
									className="w-full"
									onClick={() => handleBuyCredits(pack.id)}
									disabled={isRedirecting}
								>
									<Zap className="mr-2 h-4 w-4" />
									Buy {pack.label}
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			</div>

			{/* FAQ */}
			<Card>
				<CardHeader>
					<CardTitle>How it works</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<h4 className="font-medium">What are token credits?</h4>
						<p className="text-sm text-muted-foreground">
							Every message your agents process uses tokens (input + output). 1 credit = 1 token.
							Longer conversations use more tokens.
						</p>
					</div>
					<Separator />
					<div>
						<h4 className="font-medium">What happens when I run out?</h4>
						<p className="text-sm text-muted-foreground">
							Your agents will stop responding until you buy more credits or your free allotment
							resets on the 1st of the month.
						</p>
					</div>
					<Separator />
					<div>
						<h4 className="font-medium">Do unused credits roll over?</h4>
						<p className="text-sm text-muted-foreground">
							Yes! Purchased credits never expire. The free monthly allotment adds to your existing
							balance.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
