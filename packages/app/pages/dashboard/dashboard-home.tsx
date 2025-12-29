'use client'

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
import type { ReactNode } from 'react'
import { useWorkspace } from '../../app/providers/workspace-provider'
import type { Agent } from '../../shared/api'
import { getModelName } from '../../shared/config/models'
import type { UseQueryResult } from '@tanstack/react-query'

/** Usage data structure */
export interface UsageData {
	totalCalls: number
	totalTokens: number
	inputTokens: number
	outputTokens: number
}

export interface DashboardHomeProps {
	/** Render prop for navigation links */
	renderLink: (props: { to: string; children: ReactNode; className?: string }) => ReactNode
	/** Route paths configuration */
	routes?: {
		newAgent: string
		agents: string
		agentDetail: (id: string) => string
		tools: string
		usage: string
	}
	/** Agents query from parent app */
	useAgentsQuery: (workspaceId: string | undefined) => UseQueryResult<{ agents: Agent[] }, Error>
	/** Usage query from parent app */
	useUsageQuery: (workspaceId: string | undefined) => UseQueryResult<UsageData, Error>
}

const defaultRoutes = {
	newAgent: '/dashboard/agents/new',
	agents: '/dashboard/agents',
	agentDetail: (id: string) => `/dashboard/agents/${id}`,
	tools: '/dashboard/tools',
	usage: '/dashboard/usage',
}

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

export function DashboardHome({ renderLink, routes, useAgentsQuery, useUsageQuery }: DashboardHomeProps) {
	const r = routes ?? defaultRoutes
	const { activeWorkspace, isLoading: workspaceLoading } = useWorkspace()
	const { data: agentsData, isLoading: agentsLoading } = useAgentsQuery(activeWorkspace?.id)
	const { data: usageData, isLoading: usageLoading } = useUsageQuery(activeWorkspace?.id)

	const agents: Agent[] = agentsData?.agents ?? []
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
			title: 'Total Agents',
			value: agents.length.toString(),
			description: `${deployedAgents.length} deployed`,
			icon: Bot,
			color: 'bg-violet-500',
			trend: deployedAgents.length > 0 ? `+${deployedAgents.length}` : null,
		},
		{
			title: 'API Calls',
			value: formatNumber(usageData?.totalCalls ?? 0),
			description: 'This month',
			icon: MessageSquare,
			color: 'bg-blue-500',
			trend: null,
		},
		{
			title: 'Tokens Used',
			value: formatNumber(usageData?.totalTokens ?? 0),
			description: `${formatNumber(usageData?.inputTokens ?? 0)} in / ${formatNumber(usageData?.outputTokens ?? 0)} out`,
			icon: TrendingUp,
			color: 'bg-emerald-500',
			trend: null,
		},
		{
			title: 'Active Tools',
			value: '6',
			description: 'Available tools',
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
						Live
					</Badge>
				)
			case 'draft':
				return (
					<Badge
						variant="secondary"
						className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
					>
						Draft
					</Badge>
				)
			default:
				return <Badge variant="secondary">{status}</Badge>
		}
	}

	const quickActions = [
		{
			title: 'Create Agent',
			description: 'Build a new AI agent',
			icon: Bot,
			href: r.newAgent,
		},
		{
			title: 'Browse Tools',
			description: 'Explore available tools',
			icon: Wrench,
			href: r.tools,
		},
		{
			title: 'View Usage',
			description: 'Monitor API usage',
			icon: Activity,
			href: r.usage,
		},
	]

	return (
		<div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground text-sm sm:text-base mt-1">
						Welcome back! Here's what's happening.
					</p>
				</div>
				{renderLink({
					to: r.newAgent,
					className: 'w-full sm:w-auto',
					children: (
						<Button className="w-full sm:w-auto gap-2 h-11">
							<Plus className="h-4 w-4" />
							New Agent
						</Button>
					),
				})}
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
				{isLoading
					? [1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)
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
									<p className="mt-1 text-xs sm:text-sm text-muted-foreground">{stat.description}</p>
								</CardContent>
							</Card>
						))}
			</div>

			{/* Quick Actions */}
			<div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
				{quickActions.map((action) => (
					<div key={action.href}>
						{renderLink({
							to: action.href,
							children: (
								<Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
									<CardContent className="p-4 sm:p-6">
										<div className="flex items-center gap-3 sm:gap-4">
											<div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
												<action.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
											</div>
											<div className="flex-1 min-w-0">
												<h3 className="font-semibold text-sm sm:text-base truncate">
													{action.title}
												</h3>
												<p className="text-xs sm:text-sm text-muted-foreground truncate">
													{action.description}
												</p>
											</div>
											<ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
										</div>
									</CardContent>
								</Card>
							),
						})}
					</div>
				))}
			</div>

			{/* Recent Agents */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<div>
						<h2 className="text-lg sm:text-xl font-semibold">Recent Agents</h2>
						<p className="text-xs sm:text-sm text-muted-foreground">Your recently updated agents</p>
					</div>
					{agents.length > 0 &&
						renderLink({
							to: r.agents,
							children: (
								<Button variant="ghost" size="sm" className="gap-1 min-h-[44px]">
									View all
									<ArrowRight className="h-4 w-4" />
								</Button>
							),
						})}
				</div>

				{isLoading ? (
					<div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3].map((i) => (
							<AgentCardSkeleton key={i} />
						))}
					</div>
				) : recentAgents.length === 0 ? (
					<Card className="border-dashed border-2">
						<CardContent className="flex flex-col items-center justify-center py-12 px-4">
							<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 mb-4">
								<Bot className="h-8 w-8 text-primary" />
							</div>
							<h3 className="text-lg font-semibold mb-2">Create your first agent</h3>
							<p className="text-muted-foreground text-center text-sm max-w-xs mb-6">
								AI agents can understand context, use tools, and complete tasks.
							</p>
							{renderLink({
								to: r.newAgent,
								className: 'w-full sm:w-auto',
								children: (
									<Button className="w-full sm:w-auto gap-2 h-11">
										<Plus className="h-4 w-4" />
										Create Agent
									</Button>
								),
							})}
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{recentAgents.map((agent) => (
							<div key={agent.id}>
								{renderLink({
									to: r.agentDetail(agent.id),
									children: (
										<Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
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
													{agent.description || 'No description'}
												</p>
												<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
													<div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
														<Wrench className="h-3 w-3" />
														<span>{agent.toolIds?.length || 0} tools</span>
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
									),
								})}
							</div>
						))}

						{/* Create New Card */}
						{renderLink({
							to: r.newAgent,
							children: (
								<Card className="h-full border-dashed border-2 hover:bg-muted/50 transition-colors cursor-pointer">
									<CardContent className="flex flex-col items-center justify-center h-full min-h-[180px] p-4">
										<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted mb-3">
											<Plus className="h-6 w-6 text-muted-foreground" />
										</div>
										<span className="font-medium text-sm text-muted-foreground">
											Create new agent
										</span>
									</CardContent>
								</Card>
							),
						})}
					</div>
				)}
			</div>
		</div>
	)
}
