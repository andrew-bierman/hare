'use client'

import { Link } from '@tanstack/react-router'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent } from '@hare/ui/components/card'
import { Skeleton } from '@hare/ui/components/skeleton'
import {
	Activity,
	ArrowRight,
	ArrowUpRight,
	Bot,
	Clock,
	MessageSquare,
	Plus,
	TrendingUp,
	Wrench,
} from 'lucide-react'
import { useWorkspace } from '../../app/providers'
import { config, getModelName } from '@hare/config'
import { useAgentsQuery, useWorkspaceUsageQuery } from '../../shared/api/hooks'

const content = config.content.dashboard.home

function StatCardSkeleton() {
	return (
		<Card>
			<CardContent className="p-4 sm:p-6">
				<div className="flex items-center justify-between mb-3">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-10 w-10 rounded-lg" />
				</div>
				<Skeleton className="h-8 w-16 mb-2" />
				<Skeleton className="h-3 w-28" />
			</CardContent>
		</Card>
	)
}

function AgentCardSkeleton() {
	return (
		<Card>
			<CardContent className="p-4 sm:p-6">
				<div className="flex items-start justify-between mb-3">
					<div className="flex items-center gap-3">
						<Skeleton className="h-10 w-10 rounded-lg" />
						<div className="space-y-1.5">
							<Skeleton className="h-5 w-28" />
							<Skeleton className="h-3 w-20" />
						</div>
					</div>
					<Skeleton className="h-5 w-14 rounded-full" />
				</div>
				<Skeleton className="h-4 w-full mb-1" />
				<Skeleton className="h-4 w-2/3" />
			</CardContent>
		</Card>
	)
}

export function DashboardPage() {
	const { isLoading: workspaceLoading } = useWorkspace()
	const { data: agentsData, isLoading: agentsLoading } = useAgentsQuery()
	const { data: usageData, isLoading: usageLoading } = useWorkspaceUsageQuery()

	const agents = agentsData?.agents ?? []
	const deployedAgents = agents.filter((a) => a.status === 'deployed')
	const recentAgents = agents.slice(0, 5)

	const isLoading = workspaceLoading || agentsLoading || usageLoading

	const formatNumber = (num: number) => {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
		return num.toString()
	}

	const stats = [
		{
			title: content.stats.totalAgents.title,
			value: agents.length.toString(),
			description: `${deployedAgents.length} ${content.stats.totalAgents.description}`,
			icon: Bot,
			color: 'bg-violet-500',
			trend: deployedAgents.length > 0 ? `+${deployedAgents.length}` : null,
		},
		{
			title: content.stats.apiCalls.title,
			value: formatNumber(usageData?.usage?.totalMessages ?? 0),
			description: content.stats.apiCalls.description,
			icon: MessageSquare,
			color: 'bg-blue-500',
			trend: null,
		},
		{
			title: content.stats.tokensUsed.title,
			value: formatNumber((usageData?.usage?.totalTokensIn ?? 0) + (usageData?.usage?.totalTokensOut ?? 0)),
			description: `${formatNumber(usageData?.usage?.totalTokensIn ?? 0)} ${content.stats.tokensUsed.description.replace('in / out', '')} ${formatNumber(usageData?.usage?.totalTokensOut ?? 0)}`,
			icon: TrendingUp,
			color: 'bg-emerald-500',
			trend: null,
		},
		{
			title: content.stats.activeTools.title,
			value: '6',
			description: content.stats.activeTools.description,
			icon: Wrench,
			color: 'bg-orange-500',
			trend: null,
		},
	]

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'deployed':
				return (
					<Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1">
						<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
						{config.content.dashboard.agents.status.deployed}
					</Badge>
				)
			case 'draft':
				return (
					<Badge
						variant="secondary"
						className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
					>
						{config.content.dashboard.agents.status.draft}
					</Badge>
				)
			default:
				return <Badge variant="secondary">{status}</Badge>
		}
	}

	const ICONS = { Bot, Wrench, Activity } as const
	const quickActions = content.quickActions.map((action) => ({
		...action,
		icon: ICONS[action.icon as keyof typeof ICONS],
	}))

	return (
		<div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{content.title}</h1>
					<p className="text-muted-foreground text-sm sm:text-base mt-1">{content.subtitle}</p>
				</div>
				<Link to="/dashboard/agents/new" className="w-full sm:w-auto">
					<Button className="w-full sm:w-auto gap-2 h-11">
						<Plus className="h-4 w-4" />
						{content.newAgentButton}
					</Button>
				</Link>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
				{isLoading
					? ['stat-1', 'stat-2', 'stat-3', 'stat-4'].map((id) => <StatCardSkeleton key={id} />)
					: stats.map((stat) => (
							<Card key={stat.title}>
								<CardContent className="p-4 sm:p-6">
									<div className="flex items-center justify-between mb-3">
										<span className="text-xs sm:text-sm font-medium text-muted-foreground">
											{stat.title}
										</span>
										<div
											className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg ${stat.color}`}
										>
											<stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
										</div>
									</div>
									<div className="flex items-baseline gap-2">
										<span className="text-2xl sm:text-3xl font-bold">{stat.value}</span>
										{stat.trend && (
											<span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
												<ArrowUpRight className="h-3 w-3" />
												{stat.trend}
											</span>
										)}
									</div>
									<p className="mt-1 text-xs sm:text-sm text-muted-foreground">
										{stat.description}
									</p>
								</CardContent>
							</Card>
						))}
			</div>

			{/* Quick Actions */}
			<div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
				{quickActions.map((action) => (
					<Link key={action.href} to={action.href}>
						<Card className="h-full hover:bg-muted/50 transition-colors">
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center gap-3 sm:gap-4">
									<div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
										<action.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="font-semibold text-sm sm:text-base">{action.title}</h3>
										<p className="text-xs sm:text-sm text-muted-foreground truncate">
											{action.description}
										</p>
									</div>
									<ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>

			{/* Recent Agents */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<div>
						<h2 className="text-lg sm:text-xl font-semibold">{content.recentAgents.title}</h2>
						<p className="text-xs sm:text-sm text-muted-foreground">
							{content.recentAgents.subtitle}
						</p>
					</div>
					{agents.length > 0 && (
						<Link to="/dashboard/agents">
							<Button variant="ghost" size="sm" className="gap-1 min-h-[44px]">
								{content.recentAgents.viewAll}
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					)}
				</div>

				{isLoading ? (
					<div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{['agent-sk-1', 'agent-sk-2', 'agent-sk-3'].map((id) => (
							<AgentCardSkeleton key={id} />
						))}
					</div>
				) : recentAgents.length === 0 ? (
					<Card className="border-dashed border-2">
						<CardContent className="flex flex-col items-center justify-center py-12 px-4">
							<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 mb-4">
								<Bot className="h-8 w-8 text-primary" />
							</div>
							<h3 className="text-lg font-semibold mb-2">{content.noAgents.title}</h3>
							<p className="text-muted-foreground text-center text-sm max-w-xs mb-6">
								{content.noAgents.description}
							</p>
							<Link to="/dashboard/agents/new" className="w-full sm:w-auto">
								<Button className="w-full sm:w-auto gap-2 h-11">
									<Plus className="h-4 w-4" />
									{content.noAgents.cta}
								</Button>
							</Link>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{recentAgents.map((agent) => (
							<Link key={agent.id} to="/dashboard/agents/$id" params={{ id: agent.id }}>
								<Card className="h-full hover:bg-muted/50 transition-colors">
									<CardContent className="p-4 sm:p-6">
										<div className="flex items-start justify-between mb-3">
											<div className="flex items-center gap-3">
												<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
													<Bot className="h-5 w-5 text-primary-foreground" />
												</div>
												<div className="min-w-0">
													<h3 className="font-semibold text-sm sm:text-base truncate">
														{agent.name}
													</h3>
													<p className="text-xs text-muted-foreground">
														{getModelName(agent.model)}
													</p>
												</div>
											</div>
											{getStatusBadge(agent.status)}
										</div>
										<p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">
											{agent.description || config.ui.text.noDescription}
										</p>
										<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
											<div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
												<Wrench className="h-3 w-3" />
												<span>
													{agent.toolIds?.length || 0} {config.ui.text.tools}
												</span>
											</div>
											<div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
												<Clock className="h-3 w-3" />
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
						<Link to="/dashboard/agents/new">
							<Card className="h-full border-dashed border-2 hover:bg-muted/50 transition-colors">
								<CardContent className="flex flex-col items-center justify-center h-full min-h-[180px] p-4">
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted mb-3">
										<Plus className="h-6 w-6 text-muted-foreground" />
									</div>
									<span className="font-medium text-sm text-muted-foreground">
										{content.recentAgents.createNew}
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
