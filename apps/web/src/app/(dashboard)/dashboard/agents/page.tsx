'use client'

import { Bot, Clock, Play, Plus, Search, Settings, Wrench } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { useAgents, AVAILABLE_MODELS, type Agent } from 'web-app/lib/api/hooks'

function AgentCardSkeleton() {
	return (
		<Card className="border-border/50">
			<CardContent className="p-6">
				<div className="flex items-start justify-between mb-4">
					<div className="flex items-center gap-3">
						<Skeleton className="h-14 w-14 rounded-xl" />
						<div className="space-y-2">
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-3 w-24" />
						</div>
					</div>
					<Skeleton className="h-6 w-16 rounded-full" />
				</div>
				<Skeleton className="h-4 w-full mb-2" />
				<Skeleton className="h-4 w-2/3 mb-4" />
				<div className="flex gap-3">
					<Skeleton className="h-10 flex-1 rounded-xl" />
					<Skeleton className="h-10 flex-1 rounded-xl" />
				</div>
			</CardContent>
		</Card>
	)
}

function EmptyState() {
	return (
		<Card className="border-dashed border-2 border-border/50">
			<CardContent className="flex flex-col items-center justify-center py-20">
				<div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 mb-6">
					<Bot className="h-12 w-12 text-primary" />
				</div>
				<h3 className="text-2xl font-semibold mb-2">Create your first agent</h3>
				<p className="text-muted-foreground text-center max-w-md mb-8">
					AI agents can understand context, use tools, and complete complex tasks.
					Get started in minutes.
				</p>
				<Link href="/dashboard/agents/new">
					<Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
						<Plus className="h-5 w-5" />
						Create Agent
					</Button>
				</Link>
			</CardContent>
		</Card>
	)
}

export default function AgentsPage() {
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

	const deployedCount = agents.filter((a) => a.status === 'deployed').length
	const draftCount = agents.filter((a) => a.status === 'draft').length

	const getModelName = (modelId: string) => {
		const model = AVAILABLE_MODELS.find((m) => m.id === modelId)
		return model?.name || modelId
	}

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
			<div className="flex-1 p-8 pt-6">
				<Card className="border-destructive/50 bg-destructive/5">
					<CardContent className="flex items-center justify-center p-8 text-destructive">
						Failed to load agents: {error.message}
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex-1 p-8 pt-6 space-y-8">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Agents</h1>
					<p className="text-muted-foreground mt-1">
						Manage and monitor your AI agents
					</p>
				</div>
				<Link href="/dashboard/agents/new">
					<Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
						<Plus className="h-4 w-4" />
						New Agent
					</Button>
				</Link>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="relative flex-1 max-w-lg">
					<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search agents by name or description..."
						className="pl-10 h-11 bg-muted/50 border-transparent rounded-xl focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/20"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				<Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
					<TabsList className="bg-muted/50 p-1 rounded-xl">
						<TabsTrigger
							value="all"
							className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
						>
							All
							<Badge variant="secondary" className="h-5 px-1.5 text-xs bg-muted">
								{agents.length}
							</Badge>
						</TabsTrigger>
						<TabsTrigger
							value="deployed"
							className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
						>
							Live
							<Badge variant="secondary" className="h-5 px-1.5 text-xs bg-muted">
								{deployedCount}
							</Badge>
						</TabsTrigger>
						<TabsTrigger
							value="draft"
							className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
						>
							Drafts
							<Badge variant="secondary" className="h-5 px-1.5 text-xs bg-muted">
								{draftCount}
							</Badge>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Agent Grid */}
			{isLoading ? (
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{[...Array(6)].map((_, i) => (
						<AgentCardSkeleton key={i} />
					))}
				</div>
			) : filteredAgents.length === 0 ? (
				search || filter !== 'all' ? (
					<Card className="border-dashed border-2 border-border/50">
						<CardContent className="flex flex-col items-center justify-center py-16">
							<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
								<Search className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="font-semibold text-lg mb-1">No agents found</h3>
							<p className="text-muted-foreground text-sm text-center mb-4">
								{search
									? `No agents match "${search}"`
									: 'No agents in this category'}
							</p>
							<Button
								variant="outline"
								className="gap-2"
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
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{filteredAgents.map((agent) => (
						<Card
							key={agent.id}
							className="group relative overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
						>
							<CardContent className="p-6">
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg transition-transform duration-300 group-hover:scale-105">
											<Bot className="h-7 w-7 text-primary-foreground" />
										</div>
										<div>
											<h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
												{agent.name}
											</h3>
											<p className="text-xs text-muted-foreground">
												{getModelName(agent.model)}
											</p>
										</div>
									</div>
									{getStatusBadge(agent.status)}
								</div>

								<p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
									{agent.description || 'No description provided'}
								</p>

								<div className="flex items-center gap-3 text-xs text-muted-foreground mb-5">
									<div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full">
										<Wrench className="h-3.5 w-3.5" />
										<span>{agent.toolIds?.length || 0} tools</span>
									</div>
									<div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full">
										<Clock className="h-3.5 w-3.5" />
										<span>
											{new Date(agent.updatedAt).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
											})}
										</span>
									</div>
								</div>

								<div className="flex gap-3">
									<Link href={`/dashboard/agents/${agent.id}`} className="flex-1">
										<Button
											variant="outline"
											className="w-full gap-2 rounded-xl hover:bg-primary/10 hover:text-primary hover:border-primary/50"
										>
											<Settings className="h-4 w-4" />
											Configure
										</Button>
									</Link>
									<Link href={`/dashboard/agents/${agent.id}/playground`} className="flex-1">
										<Button
											className="w-full gap-2 rounded-xl shadow-md shadow-primary/25"
											disabled={agent.status !== 'deployed'}
										>
											<Play className="h-4 w-4" />
											Test
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					))}

					{/* Create New Card */}
					<Link href="/dashboard/agents/new" className="group block">
						<Card className="h-full border-dashed border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
							<CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] p-6">
								<div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted mb-5 transition-all duration-300 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/25">
									<Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
								</div>
								<span className="font-semibold text-lg text-muted-foreground group-hover:text-primary transition-colors">
									Create New Agent
								</span>
								<span className="text-sm text-muted-foreground mt-1">
									Build something amazing
								</span>
							</CardContent>
						</Card>
					</Link>
				</div>
			)}
		</div>
	)
}
