'use client'

import {
	Activity,
	ArrowRight,
	ArrowUpRight,
	Bot,
	Clock,
	MessageSquare,
	Plus,
	Sparkles,
	TrendingUp,
	Wrench,
	Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { useAgents, useUsage, AVAILABLE_MODELS, type Agent } from 'web-app/lib/api/hooks'

function StatCardSkeleton() {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-8 w-8 rounded-lg" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-8 w-20 mb-2" />
				<Skeleton className="h-3 w-32" />
			</CardContent>
		</Card>
	)
}

function AgentCardSkeleton() {
	return (
		<div className="group relative overflow-hidden rounded-xl border bg-card p-6">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<Skeleton className="h-10 w-10 rounded-lg" />
					<div className="space-y-2">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-3 w-48" />
					</div>
				</div>
				<Skeleton className="h-5 w-16 rounded-full" />
			</div>
			<div className="mt-4 flex items-center gap-4">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-4 w-20" />
			</div>
		</div>
	)
}

export default function DashboardPage() {
	const { activeWorkspace, isLoading: workspaceLoading } = useWorkspace()
	const { data: agentsData, isLoading: agentsLoading } = useAgents(activeWorkspace?.id)
	const { data: usageData, isLoading: usageLoading } = useUsage(activeWorkspace?.id)

	const agents: Agent[] = agentsData?.agents ?? []
	const deployedAgents = agents.filter((a) => a.status === 'deployed')
	const recentAgents = agents.slice(0, 5)

	const isLoading = workspaceLoading || agentsLoading || usageLoading

	const formatNumber = (num: number) => {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
		return num.toString()
	}

	const getModelName = (modelId: string) => {
		const model = AVAILABLE_MODELS.find((m) => m.id === modelId)
		return model?.name || modelId
	}

	const stats = [
		{
			title: 'Total Agents',
			value: agents.length.toString(),
			description: `${deployedAgents.length} currently deployed`,
			icon: Bot,
			color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
			iconBg: 'bg-violet-500/10',
			trend: deployedAgents.length > 0 ? '+' + deployedAgents.length : null,
			trendUp: true,
		},
		{
			title: 'API Calls',
			value: formatNumber(usageData?.totalCalls ?? 0),
			description: 'This billing period',
			icon: MessageSquare,
			color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
			iconBg: 'bg-blue-500/10',
			trend: null,
			trendUp: true,
		},
		{
			title: 'Tokens Used',
			value: formatNumber(usageData?.totalTokens ?? 0),
			description: `${formatNumber(usageData?.inputTokens ?? 0)} in / ${formatNumber(usageData?.outputTokens ?? 0)} out`,
			icon: TrendingUp,
			color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
			iconBg: 'bg-emerald-500/10',
			trend: null,
			trendUp: true,
		},
		{
			title: 'Active Tools',
			value: '6',
			description: 'System tools available',
			icon: Wrench,
			color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
			iconBg: 'bg-orange-500/10',
			trend: null,
			trendUp: true,
		},
	]

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'deployed':
				return (
					<Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20">
						<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
						Live
					</Badge>
				)
			case 'draft':
				return (
					<Badge
						variant="secondary"
						className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/20"
					>
						Draft
					</Badge>
				)
			default:
				return (
					<Badge variant="secondary" className="bg-muted">
						{status}
					</Badge>
				)
		}
	}

	return (
		<div className="flex-1 space-y-8 p-8 pt-6">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground mt-1">
						Welcome back! Here's an overview of your agents and usage.
					</p>
				</div>
				<Link href="/dashboard/agents/new">
					<Button size="lg" className="gap-2">
						<Plus className="h-4 w-4" />
						New Agent
					</Button>
				</Link>
			</div>

			{/* Stats Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{isLoading
					? [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
					: stats.map((stat) => (
							<Card
								key={stat.title}
								className="relative overflow-hidden transition-all hover:shadow-md"
							>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium text-muted-foreground">
										{stat.title}
									</CardTitle>
									<div className={`rounded-lg p-2 ${stat.iconBg}`}>
										<stat.icon className={`h-4 w-4 ${stat.color.split(' ')[1]}`} />
									</div>
								</CardHeader>
								<CardContent>
									<div className="flex items-baseline gap-2">
										<span className="text-3xl font-bold">{stat.value}</span>
										{stat.trend && (
											<span className="flex items-center text-xs font-medium text-emerald-600">
												<ArrowUpRight className="h-3 w-3" />
												{stat.trend}
											</span>
										)}
									</div>
									<p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
								</CardContent>
							</Card>
						))}
			</div>

			{/* Quick Actions */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
					<Link href="/dashboard/agents/new" className="block p-6">
						<div className="flex items-center gap-4">
							<div className="rounded-xl bg-primary/10 p-3 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
								<Sparkles className="h-6 w-6" />
							</div>
							<div className="flex-1">
								<h3 className="font-semibold">Create Agent</h3>
								<p className="text-sm text-muted-foreground">Build a new AI agent</p>
							</div>
							<ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
						</div>
					</Link>
				</Card>
				<Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
					<Link href="/dashboard/tools" className="block p-6">
						<div className="flex items-center gap-4">
							<div className="rounded-xl bg-orange-500/10 p-3 transition-colors group-hover:bg-orange-500 group-hover:text-white">
								<Wrench className="h-6 w-6" />
							</div>
							<div className="flex-1">
								<h3 className="font-semibold">Manage Tools</h3>
								<p className="text-sm text-muted-foreground">Configure agent capabilities</p>
							</div>
							<ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
						</div>
					</Link>
				</Card>
				<Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
					<Link href="/dashboard/usage" className="block p-6">
						<div className="flex items-center gap-4">
							<div className="rounded-xl bg-blue-500/10 p-3 transition-colors group-hover:bg-blue-500 group-hover:text-white">
								<Activity className="h-6 w-6" />
							</div>
							<div className="flex-1">
								<h3 className="font-semibold">View Analytics</h3>
								<p className="text-sm text-muted-foreground">Monitor usage & performance</p>
							</div>
							<ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
						</div>
					</Link>
				</Card>
			</div>

			{/* Recent Agents */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<div>
						<h2 className="text-xl font-semibold">Recent Agents</h2>
						<p className="text-sm text-muted-foreground">Your agents ordered by last update</p>
					</div>
					{agents.length > 0 && (
						<Link href="/dashboard/agents">
							<Button variant="ghost" size="sm" className="gap-1">
								View all
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					)}
				</div>

				{isLoading ? (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{[...Array(3)].map((_, i) => (
							<AgentCardSkeleton key={i} />
						))}
					</div>
				) : recentAgents.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-16">
							<div className="rounded-full bg-muted p-4 mb-4">
								<Bot className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="text-lg font-semibold mb-1">No agents yet</h3>
							<p className="text-muted-foreground text-center max-w-sm mb-6">
								Create your first AI agent to get started. It only takes a few minutes.
							</p>
							<Link href="/dashboard/agents/new">
								<Button className="gap-2">
									<Plus className="h-4 w-4" />
									Create Your First Agent
								</Button>
							</Link>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{recentAgents.map((agent) => (
							<Link
								key={agent.id}
								href={`/dashboard/agents/${agent.id}`}
								className="group block"
							>
								<Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
									<CardContent className="p-6">
										<div className="flex items-start justify-between mb-4">
											<div className="flex items-center gap-3">
												<div className="rounded-lg bg-primary/10 p-2.5 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
													<Bot className="h-5 w-5" />
												</div>
												<div>
													<h3 className="font-semibold group-hover:text-primary transition-colors">
														{agent.name}
													</h3>
													<p className="text-xs text-muted-foreground">
														{getModelName(agent.model)}
													</p>
												</div>
											</div>
											{getStatusBadge(agent.status)}
										</div>
										<p className="text-sm text-muted-foreground line-clamp-2 mb-4">
											{agent.description || 'No description provided'}
										</p>
										<div className="flex items-center gap-4 text-xs text-muted-foreground">
											<div className="flex items-center gap-1">
												<Wrench className="h-3.5 w-3.5" />
												<span>{agent.toolIds?.length || 0} tools</span>
											</div>
											<div className="flex items-center gap-1">
												<Clock className="h-3.5 w-3.5" />
												<span>
													Updated{' '}
													{new Date(agent.updatedAt).toLocaleDateString('en-US', {
														month: 'short',
														day: 'numeric',
													})}
												</span>
											</div>
										</div>
									</CardContent>
								</Card>
							</Link>
						))}

						{/* Create New Card */}
						<Link href="/dashboard/agents/new" className="group block">
							<Card className="h-full border-dashed transition-all hover:shadow-md hover:border-primary">
								<CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] p-6">
									<div className="rounded-full bg-muted p-3 mb-3 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
										<Plus className="h-6 w-6" />
									</div>
									<span className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
										Create New Agent
									</span>
								</CardContent>
							</Card>
						</Link>
					</div>
				)}
			</div>
		</div>
	)
}
