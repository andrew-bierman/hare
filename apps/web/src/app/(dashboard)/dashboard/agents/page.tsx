'use client'

import { Bot, Clock, Filter, LayoutGrid, List, Play, Plus, Search, Settings, Wrench } from 'lucide-react'
import Link from 'next/link'
import { type ChangeEvent, useState } from 'react'
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
import { Input } from '@workspace/ui/components/input'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { useAgents, AVAILABLE_MODELS, type Agent } from 'web-app/lib/api/hooks'

function AgentCardSkeleton() {
	return (
		<Card className="group relative overflow-hidden">
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
				<Skeleton className="h-4 w-2/3 mb-4" />
				<div className="flex gap-2">
					<Skeleton className="h-9 flex-1" />
					<Skeleton className="h-9 flex-1" />
				</div>
			</CardContent>
		</Card>
	)
}

function EmptyState() {
	return (
		<Card className="border-dashed">
			<CardContent className="flex flex-col items-center justify-center py-16">
				<div className="rounded-full bg-primary/10 p-4 mb-4">
					<Bot className="h-8 w-8 text-primary" />
				</div>
				<h3 className="text-xl font-semibold mb-2">Create your first agent</h3>
				<p className="text-muted-foreground text-center max-w-md mb-6">
					AI agents can understand context, use tools, and complete complex tasks.
					Get started in minutes.
				</p>
				<Link href="/dashboard/agents/new">
					<Button size="lg" className="gap-2">
						<Plus className="h-4 w-4" />
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
					<Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20">
						<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
						Live
					</Badge>
				)
			case 'draft':
				return (
					<Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/20">
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
				<Card className="border-destructive bg-destructive/10">
					<CardContent className="flex items-center justify-center p-6 text-destructive">
						Failed to load agents: {error.message}
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Agents</h1>
					<p className="text-muted-foreground mt-1">
						Manage and monitor your AI agents
					</p>
				</div>
				<Link href="/dashboard/agents/new">
					<Button size="lg" className="gap-2">
						<Plus className="h-4 w-4" />
						New Agent
					</Button>
				</Link>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search agents by name or description..."
						className="pl-10"
						value={search}
						onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
					/>
				</div>
				<Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
					<TabsList>
						<TabsTrigger value="all" className="gap-1.5">
							All
							<Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
								{agents.length}
							</Badge>
						</TabsTrigger>
						<TabsTrigger value="deployed" className="gap-1.5">
							Live
							<Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
								{deployedCount}
							</Badge>
						</TabsTrigger>
						<TabsTrigger value="draft" className="gap-1.5">
							Drafts
							<Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
								{draftCount}
							</Badge>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Agent Grid */}
			{isLoading ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{[...Array(6)].map((_, i) => (
						<AgentCardSkeleton key={i} />
					))}
				</div>
			) : filteredAgents.length === 0 ? (
				search || filter !== 'all' ? (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12">
							<Search className="h-8 w-8 text-muted-foreground mb-4" />
							<h3 className="font-semibold mb-1">No agents found</h3>
							<p className="text-muted-foreground text-sm text-center">
								{search
									? `No agents match "${search}"`
									: 'No agents in this category'}
							</p>
							{(search || filter !== 'all') && (
								<Button
									variant="ghost"
									className="mt-4"
									onClick={() => {
										setSearch('')
										setFilter('all')
									}}
								>
									Clear filters
								</Button>
							)}
						</CardContent>
					</Card>
				) : (
					<EmptyState />
				)
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{filteredAgents.map((agent) => (
						<Card
							key={agent.id}
							className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50"
						>
							<CardContent className="p-6">
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="rounded-xl bg-primary/10 p-3 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
											<Bot className="h-6 w-6" />
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

								<p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
									{agent.description || 'No description provided'}
								</p>

								<div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
									<div className="flex items-center gap-1">
										<Wrench className="h-3.5 w-3.5" />
										<span>{agent.toolIds?.length || 0} tools</span>
									</div>
									<div className="flex items-center gap-1">
										<Clock className="h-3.5 w-3.5" />
										<span>
											{new Date(agent.updatedAt).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
											})}
										</span>
									</div>
								</div>

								<div className="flex gap-2">
									<Link href={`/dashboard/agents/${agent.id}`} className="flex-1">
										<Button variant="outline" className="w-full gap-1.5">
											<Settings className="h-4 w-4" />
											Configure
										</Button>
									</Link>
									<Link href={`/dashboard/agents/${agent.id}/playground`} className="flex-1">
										<Button
											className="w-full gap-1.5"
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
						<Card className="h-full border-dashed transition-all hover:shadow-md hover:border-primary">
							<CardContent className="flex flex-col items-center justify-center h-full min-h-[280px] p-6">
								<div className="rounded-full bg-muted p-4 mb-4 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
									<Plus className="h-6 w-6" />
								</div>
								<span className="font-semibold text-muted-foreground group-hover:text-primary transition-colors">
									Create New Agent
								</span>
								<span className="text-xs text-muted-foreground mt-1">
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
