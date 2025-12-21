'use client'

import { Bot, MessageSquare, Plus, TrendingUp, Wrench } from 'lucide-react'
import Link from 'next/link'
import { Button } from 'web-app/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from 'web-app/components/ui/card'
import { Skeleton } from 'web-app/components/ui/skeleton'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { useAgents, useUsage, AVAILABLE_MODELS } from 'web-app/lib/api/hooks'

function StatCardSkeleton() {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-4 w-4" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-8 w-16 mb-1" />
				<Skeleton className="h-3 w-32" />
			</CardContent>
		</Card>
	)
}

export default function DashboardPage() {
	const { activeWorkspace, isLoading: workspaceLoading } = useWorkspace()
	const { data: agentsData, isLoading: agentsLoading } = useAgents(activeWorkspace?.id)
	const { data: usageData, isLoading: usageLoading } = useUsage(activeWorkspace?.id)

	const agents = agentsData?.agents ?? []
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
			description: `${deployedAgents.length} deployed`,
			icon: Bot,
			color: 'text-violet-500',
		},
		{
			title: 'API Calls',
			value: formatNumber(usageData?.totalCalls ?? 0),
			description: 'This billing period',
			icon: MessageSquare,
			color: 'text-blue-500',
		},
		{
			title: 'Tokens Used',
			value: formatNumber(usageData?.totalTokens ?? 0),
			description: `${formatNumber(usageData?.inputTokens ?? 0)} in / ${formatNumber(usageData?.outputTokens ?? 0)} out`,
			icon: TrendingUp,
			color: 'text-emerald-500',
		},
		{
			title: 'Tools Available',
			value: '5+',
			description: 'System tools ready',
			icon: Wrench,
			color: 'text-pink-500',
		},
	]

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between space-y-2">
				<h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
				<Link href="/dashboard/agents/new">
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						New Agent
					</Button>
				</Link>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{isLoading
					? [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
					: stats.map((stat) => (
							<Card key={stat.title}>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
									<stat.icon className={`h-4 w-4 ${stat.color}`} />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{stat.value}</div>
									<p className="text-xs text-muted-foreground">{stat.description}</p>
								</CardContent>
							</Card>
						))}
			</div>

			<Card className="col-span-4">
				<CardHeader>
					<CardTitle>Recent Agents</CardTitle>
					<CardDescription>Your agents ordered by last update</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="space-y-4">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="flex items-center justify-between p-4 border rounded-lg">
									<div className="space-y-2">
										<Skeleton className="h-4 w-48" />
										<Skeleton className="h-3 w-64" />
									</div>
									<div className="flex items-center gap-4">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-6 w-16 rounded-full" />
									</div>
								</div>
							))}
						</div>
					) : recentAgents.length === 0 ? (
						<div className="text-center py-8">
							<Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-muted-foreground">No agents yet. Create your first agent to get started.</p>
							<Link href="/dashboard/agents/new">
								<Button className="mt-4">
									<Plus className="mr-2 h-4 w-4" />
									Create Agent
								</Button>
							</Link>
						</div>
					) : (
						<div className="space-y-4">
							{recentAgents.map((agent) => (
								<Link
									key={agent.id}
									href={`/dashboard/agents/${agent.id}`}
									className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
								>
									<div className="space-y-1">
										<p className="text-sm font-medium leading-none">{agent.name}</p>
										<p className="text-sm text-muted-foreground">
											{agent.description || 'No description'}
										</p>
									</div>
									<div className="flex items-center gap-4">
										<div className="text-sm text-muted-foreground">{getModelName(agent.model)}</div>
										<div
											className={`px-2 py-1 rounded-full text-xs font-medium ${
												agent.status === 'deployed'
													? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
													: agent.status === 'draft'
														? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
														: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
											}`}
										>
											{agent.status}
										</div>
									</div>
								</Link>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
