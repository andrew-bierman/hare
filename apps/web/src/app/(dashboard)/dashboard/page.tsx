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
		<Card className="border-border/50">
			<CardContent className="p-6">
				<div className="flex items-center justify-between mb-4">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-10 rounded-xl" />
				</div>
				<Skeleton className="h-9 w-20 mb-2" />
				<Skeleton className="h-3 w-32" />
			</CardContent>
		</Card>
	)
}

function AgentCardSkeleton() {
	return (
		<Card className="border-border/50">
			<CardContent className="p-6">
				<div className="flex items-start justify-between mb-4">
					<div className="flex items-center gap-3">
						<Skeleton className="h-12 w-12 rounded-xl" />
						<div className="space-y-2">
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-3 w-24" />
						</div>
					</div>
					<Skeleton className="h-6 w-16 rounded-full" />
				</div>
				<Skeleton className="h-4 w-full mb-2" />
				<Skeleton className="h-4 w-2/3" />
			</CardContent>
		</Card>
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
			gradient: 'from-violet-500 to-purple-600',
			bgGradient: 'from-violet-500/10 to-purple-600/10',
			trend: deployedAgents.length > 0 ? '+' + deployedAgents.length : null,
		},
		{
			title: 'API Calls',
			value: formatNumber(usageData?.totalCalls ?? 0),
			description: 'This billing period',
			icon: MessageSquare,
			gradient: 'from-blue-500 to-cyan-500',
			bgGradient: 'from-blue-500/10 to-cyan-500/10',
			trend: null,
		},
		{
			title: 'Tokens Used',
			value: formatNumber(usageData?.totalTokens ?? 0),
			description: `${formatNumber(usageData?.inputTokens ?? 0)} in / ${formatNumber(usageData?.outputTokens ?? 0)} out`,
			icon: TrendingUp,
			gradient: 'from-emerald-500 to-teal-500',
			bgGradient: 'from-emerald-500/10 to-teal-500/10',
			trend: null,
		},
		{
			title: 'Active Tools',
			value: '6',
			description: 'System tools available',
			icon: Wrench,
			gradient: 'from-orange-500 to-amber-500',
			bgGradient: 'from-orange-500/10 to-amber-500/10',
			trend: null,
		},
	]

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'deployed':
				return (
					<Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 gap-1.5">
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
						</span>
						Live
					</Badge>
				)
			case 'draft':
				return (
					<Badge
						variant="secondary"
						className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20"
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

	const quickActions = [
		{
			title: 'Create Agent',
			description: 'Build a new AI agent',
			icon: Sparkles,
			href: '/dashboard/agents/new',
			gradient: 'from-violet-500 to-purple-600',
		},
		{
			title: 'Manage Tools',
			description: 'Configure agent capabilities',
			icon: Wrench,
			href: '/dashboard/tools',
			gradient: 'from-orange-500 to-amber-500',
		},
		{
			title: 'View Analytics',
			description: 'Monitor usage & performance',
			icon: Activity,
			href: '/dashboard/usage',
			gradient: 'from-blue-500 to-cyan-500',
		},
	]

	return (
		<div className="flex-1 p-8 pt-6 space-y-8">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground mt-1">
						Welcome back! Here's an overview of your agents and usage.
					</p>
				</div>
				<Link href="/dashboard/agents/new">
					<Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
						<Plus className="h-4 w-4" />
						New Agent
					</Button>
				</Link>
			</div>

			{/* Stats Grid */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				{isLoading
					? [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
					: stats.map((stat) => (
							<Card
								key={stat.title}
								className="group relative overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
							>
								{/* Background gradient on hover */}
								<div
									className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
								/>

								<CardContent className="relative p-6">
									<div className="flex items-center justify-between mb-4">
										<span className="text-sm font-medium text-muted-foreground">
											{stat.title}
										</span>
										<div
											className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}
										>
											<stat.icon className="h-5 w-5 text-white" />
										</div>
									</div>
									<div className="flex items-baseline gap-2">
										<span className="text-3xl font-bold">{stat.value}</span>
										{stat.trend && (
											<span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
												<ArrowUpRight className="h-3 w-3" />
												{stat.trend}
											</span>
										)}
									</div>
									<p className="mt-1 text-sm text-muted-foreground">{stat.description}</p>
								</CardContent>
							</Card>
						))}
			</div>

			{/* Quick Actions */}
			<div className="grid gap-6 md:grid-cols-3">
				{quickActions.map((action) => (
					<Link key={action.href} href={action.href} className="group block">
						<Card className="h-full border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
							<CardContent className="p-6">
								<div className="flex items-center gap-4">
									<div
										className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${action.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}
									>
										<action.icon className="h-7 w-7 text-white" />
									</div>
									<div className="flex-1">
										<h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
											{action.title}
										</h3>
										<p className="text-sm text-muted-foreground">{action.description}</p>
									</div>
									<ArrowRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>

			{/* Recent Agents */}
			<div>
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-xl font-semibold">Recent Agents</h2>
						<p className="text-sm text-muted-foreground mt-0.5">Your agents ordered by last update</p>
					</div>
					{agents.length > 0 && (
						<Link href="/dashboard/agents">
							<Button variant="ghost" size="sm" className="gap-1.5 hover:bg-primary/10 hover:text-primary">
								View all
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					)}
				</div>

				{isLoading ? (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{[...Array(3)].map((_, i) => (
							<AgentCardSkeleton key={i} />
						))}
					</div>
				) : recentAgents.length === 0 ? (
					<Card className="border-dashed border-2 border-border/50">
						<CardContent className="flex flex-col items-center justify-center py-16">
							<div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 mb-6">
								<Bot className="h-10 w-10 text-primary" />
							</div>
							<h3 className="text-xl font-semibold mb-2">No agents yet</h3>
							<p className="text-muted-foreground text-center max-w-sm mb-6">
								Create your first AI agent to get started. It only takes a few minutes.
							</p>
							<Link href="/dashboard/agents/new">
								<Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
									<Plus className="h-4 w-4" />
									Create Your First Agent
								</Button>
							</Link>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{recentAgents.map((agent) => (
							<Link
								key={agent.id}
								href={`/dashboard/agents/${agent.id}`}
								className="group block"
							>
								<Card className="h-full border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
									<CardContent className="p-6">
										<div className="flex items-start justify-between mb-4">
											<div className="flex items-center gap-3">
												<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg transition-transform duration-300 group-hover:scale-105">
													<Bot className="h-6 w-6 text-primary-foreground" />
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
											<div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-full">
												<Wrench className="h-3.5 w-3.5" />
												<span>{agent.toolIds?.length || 0} tools</span>
											</div>
											<div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-full">
												<Clock className="h-3.5 w-3.5" />
												<span>
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
							<Card className="h-full border-dashed border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
								<CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] p-6">
									<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4 transition-all duration-300 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/25">
										<Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
									</div>
									<span className="font-semibold text-muted-foreground group-hover:text-primary transition-colors">
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
