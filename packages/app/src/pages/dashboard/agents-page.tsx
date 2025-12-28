'use client'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Bot, Clock, Plus, Search, Settings, Wrench } from 'lucide-react'
import { type ChangeEvent, useState, type ReactNode } from 'react'
import { useWorkspace } from '../../app/providers/workspace-provider'
import { useAgents, type Agent } from '../../entities/agent'
import { AVAILABLE_MODELS } from '../../shared/config/models'

export interface AgentsPageProps {
	/** Render prop for navigation links */
	renderLink: (props: { to: string; children: ReactNode; className?: string }) => ReactNode
	/** Route paths configuration */
	routes?: {
		newAgent: string
		agentDetail: (id: string) => string
	}
}

const defaultRoutes = {
	newAgent: '/dashboard/agents/new',
	agentDetail: (id: string) => `/dashboard/agents/${id}`,
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
				<Skeleton className="h-4 w-2/3 mb-4" />
				<div className="flex gap-2">
					<Skeleton className="h-10 flex-1 rounded-lg" />
					<Skeleton className="h-10 flex-1 rounded-lg" />
				</div>
			</CardContent>
		</Card>
	)
}

function EmptyState({ renderLink, routes }: Pick<AgentsPageProps, 'renderLink' | 'routes'>) {
	const r = routes ?? defaultRoutes
	return (
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
	)
}

export function AgentsPage({ renderLink, routes }: AgentsPageProps) {
	const r = routes ?? defaultRoutes
	const { activeWorkspace } = useWorkspace()
	const { data, isLoading, error } = useAgents(activeWorkspace?.id)
	const [search, setSearch] = useState('')
	const [filter, setFilter] = useState<'all' | 'deployed' | 'draft'>('all')

	const agents: Agent[] = data?.agents ?? []
	const filteredAgents = agents.filter((agent) => {
		const matchesSearch =
			agent.name.toLowerCase().includes(search.toLowerCase()) ||
			agent.description?.toLowerCase().includes(search.toLowerCase())
		const matchesFilter =
			filter === 'all' ||
			(filter === 'deployed' && agent.status === 'deployed') ||
			(filter === 'draft' && agent.status === 'draft')
		return matchesSearch && matchesFilter
	})

	const getModelName = (modelId: string) => {
		const model = AVAILABLE_MODELS.find((m) => m.id === modelId)
		return model?.name || modelId
	}

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

	if (error) {
		return (
			<div className="flex-1 p-4 sm:p-6 md:p-8">
				<Card className="border-destructive">
					<CardContent className="p-6">
						<p className="text-destructive">Failed to load agents. Please try again.</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agents</h1>
					<p className="text-muted-foreground text-sm sm:text-base mt-1">
						Create and manage your AI agents
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

			{/* Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
					<TabsList>
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="deployed">Deployed</TabsTrigger>
						<TabsTrigger value="draft">Draft</TabsTrigger>
					</TabsList>
				</Tabs>
				<div className="relative w-full sm:w-64">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search agents..."
						value={search}
						onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>

			{/* Content */}
			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<AgentCardSkeleton key={i} />
					))}
				</div>
			) : filteredAgents.length === 0 && agents.length === 0 ? (
				<EmptyState renderLink={renderLink} routes={routes} />
			) : filteredAgents.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12 px-4">
						<Search className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-semibold mb-2">No agents found</h3>
						<p className="text-muted-foreground text-center text-sm">
							Try adjusting your search or filter
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredAgents.map((agent) => (
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
									<span className="font-medium text-sm text-muted-foreground">Create new agent</span>
								</CardContent>
							</Card>
						),
					})}
				</div>
			)}
		</div>
	)
}
