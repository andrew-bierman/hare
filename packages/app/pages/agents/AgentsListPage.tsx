'use client'

import { Link } from '@tanstack/react-router'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent } from '@hare/ui/components/card'
import { Input } from '@hare/ui/components/input'
import { Skeleton } from '@hare/ui/components/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@hare/ui/components/tabs'
import { Bot, Clock, Plus, SearchIcon, Settings, Wrench } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import { useWorkspace } from '../../app/providers'
import type { Agent } from '@hare/types'
import { useAgentsQuery } from '../../shared/api/hooks'
import { AI_MODELS } from '@hare/config'

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

function EmptyState() {
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
				<Link to="/dashboard/agents/new" className="w-full sm:w-auto">
					<Button className="w-full sm:w-auto gap-2 h-11">
						<Plus className="h-4 w-4" />
						Create Agent
					</Button>
				</Link>
			</CardContent>
		</Card>
	)
}

export function AgentsListPage() {
	const { activeWorkspace } = useWorkspace()
	const { data, isLoading, error } = useAgentsQuery(activeWorkspace?.id)
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

	const deployedCount = agents.filter((a) => a.status === 'deployed').length
	const draftCount = agents.filter((a) => a.status === 'draft').length

	const getModelName = (modelId: string) => {
		const model = AI_MODELS.find((m) => m.id === modelId)
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
			case 'archived':
				return (
					<Badge variant="outline" className="text-muted-foreground">
						Archived
					</Badge>
				)
			default:
				return <Badge variant="secondary">{status}</Badge>
		}
	}

	if (error) {
		return (
			<div className="flex-1 p-4 sm:p-6 md:p-8">
				<Card className="border-destructive/50 bg-destructive/5">
					<CardContent className="flex items-center justify-center p-6 text-destructive text-sm">
						Failed to load agents: {error.message}
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex-1 p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agents</h1>
					<p className="text-muted-foreground text-sm sm:text-base mt-1">
						Manage and monitor your AI agents
					</p>
				</div>
				<Link to="/dashboard/agents/new" className="w-full sm:w-auto">
					<Button className="w-full sm:w-auto gap-2 h-11">
						<Plus className="h-4 w-4" />
						New Agent
					</Button>
				</Link>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative flex-1 max-w-lg">
					<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search agents..."
						className="pl-9 h-11"
						value={search}
						onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
					/>
				</div>
				<Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
					<TabsList className="w-full sm:w-auto">
						<TabsTrigger value="all" className="flex-1 sm:flex-initial gap-1.5 min-h-[40px]">
							All
							<Badge variant="secondary" className="h-5 px-1.5 text-xs">
								{agents.length}
							</Badge>
						</TabsTrigger>
						<TabsTrigger value="deployed" className="flex-1 sm:flex-initial gap-1.5 min-h-[40px]">
							Live
							<Badge variant="secondary" className="h-5 px-1.5 text-xs">
								{deployedCount}
							</Badge>
						</TabsTrigger>
						<TabsTrigger value="draft" className="flex-1 sm:flex-initial gap-1.5 min-h-[40px]">
							Drafts
							<Badge variant="secondary" className="h-5 px-1.5 text-xs">
								{draftCount}
							</Badge>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Agent Grid */}
			{isLoading ? (
				<div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5', 'sk-6'].map((id) => (
						<AgentCardSkeleton key={id} />
					))}
				</div>
			) : filteredAgents.length === 0 ? (
				search || filter !== 'all' ? (
					<Card className="border-dashed border-2">
						<CardContent className="flex flex-col items-center justify-center py-12 px-4">
							<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted mb-4">
								<SearchIcon className="h-6 w-6 text-muted-foreground" />
							</div>
							<h3 className="font-semibold mb-1">No agents found</h3>
							<p className="text-muted-foreground text-sm text-center mb-4">
								{search ? `No agents match "${search}"` : 'No agents in this category'}
							</p>
							<Button
								variant="outline"
								className="gap-2 h-11"
								onClick={() => {
									setSearch('')
									setFilter('all')
								}}
							>
								Clear filters
							</Button>
						</CardContent>
					</Card>
				) : (
					<EmptyState />
				)
			) : (
				<div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredAgents.map((agent) => (
						<Card key={agent.id} className="hover:bg-muted/50 transition-colors">
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-start justify-between mb-3">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary flex-shrink-0">
											<Bot className="h-5 w-5 text-primary-foreground" />
										</div>
										<div className="min-w-0">
											<h3 className="font-semibold text-sm sm:text-base truncate">{agent.name}</h3>
											<p className="text-xs text-muted-foreground">{getModelName(agent.model)}</p>
										</div>
									</div>
									{getStatusBadge(agent.status)}
								</div>

								<p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">
									{agent.description || 'No description provided'}
								</p>

								<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4">
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

								<div className="flex gap-2">
									<Link to="/dashboard/agents/$id" params={{ id: agent.id }} className="flex-1">
										<Button variant="outline" className="w-full gap-2 h-10">
											<Settings className="h-4 w-4" />
											<span className="hidden sm:inline">Configure</span>
											<span className="sm:hidden">Edit</span>
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					))}

					{/* Create New Card */}
					<Link to="/dashboard/agents/new">
						<Card className="h-full border-dashed border-2 hover:bg-muted/50 transition-colors">
							<CardContent className="flex flex-col items-center justify-center h-full min-h-[220px] p-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted mb-3">
									<Plus className="h-6 w-6 text-muted-foreground" />
								</div>
								<span className="font-medium text-sm text-muted-foreground">Create New Agent</span>
							</CardContent>
						</Card>
					</Link>
				</div>
			)}
		</div>
	)
}
