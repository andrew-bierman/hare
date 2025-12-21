'use client'

import { Bot, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@repo/ui/components/card'
import { Input } from '@repo/ui/components/input'
import { Skeleton } from '@repo/ui/components/skeleton'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { useAgents, AVAILABLE_MODELS, type Agent } from 'web-app/lib/api/hooks'

function AgentCardSkeleton() {
	return (
		<Card className="flex flex-col">
			<CardHeader>
				<div className="flex items-start justify-between">
					<Skeleton className="h-8 w-8 rounded" />
					<Skeleton className="h-5 w-16" />
				</div>
				<Skeleton className="h-6 w-3/4 mt-4" />
				<Skeleton className="h-4 w-full mt-2" />
			</CardHeader>
			<CardContent className="flex-1">
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
				</div>
			</CardContent>
			<CardFooter className="flex gap-2">
				<Skeleton className="h-10 flex-1" />
				<Skeleton className="h-10 flex-1" />
			</CardFooter>
		</Card>
	)
}

function EmptyState() {
	return (
		<Card className="flex flex-col items-center justify-center p-12 text-center">
			<Bot className="h-12 w-12 text-muted-foreground mb-4" />
			<h3 className="text-lg font-semibold">No agents yet</h3>
			<p className="text-muted-foreground mt-2 mb-4">
				Create your first AI agent to get started.
			</p>
			<Link href="/dashboard/agents/new">
				<Button>
					<Plus className="mr-2 h-4 w-4" />
					Create Agent
				</Button>
			</Link>
		</Card>
	)
}

export default function AgentsPage() {
	const { activeWorkspace } = useWorkspace()
	const { data, isLoading, error } = useAgents(activeWorkspace?.id)
	const [search, setSearch] = useState('')

	const agents: Agent[] = data?.agents ?? []
	const filteredAgents = agents.filter(
		(agent) =>
			agent.name.toLowerCase().includes(search.toLowerCase()) ||
			agent.description?.toLowerCase().includes(search.toLowerCase())
	)

	const getModelName = (modelId: string) => {
		const model = AVAILABLE_MODELS.find((m) => m.id === modelId)
		return model?.name || modelId
	}

	const getStatusDisplay = (status: string) => {
		switch (status) {
			case 'deployed':
				return { label: 'Active', variant: 'default' as const, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' }
			case 'draft':
				return { label: 'Draft', variant: 'secondary' as const, className: '' }
			case 'archived':
				return { label: 'Archived', variant: 'outline' as const, className: '' }
			default:
				return { label: status, variant: 'secondary' as const, className: '' }
		}
	}

	if (error) {
		return (
			<div className="flex-1 p-8 pt-6">
				<Card className="p-6 text-center text-destructive">
					Failed to load agents: {error.message}
				</Card>
			</div>
		)
	}

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Agents</h2>
				<Link href="/dashboard/agents/new">
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						New Agent
					</Button>
				</Link>
			</div>

			<div className="flex items-center space-x-2">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search agents..."
						className="pl-8"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
			</div>

			{isLoading ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{[...Array(6)].map((_, i) => (
						<AgentCardSkeleton key={i} />
					))}
				</div>
			) : filteredAgents.length === 0 ? (
				search ? (
					<Card className="p-6 text-center text-muted-foreground">
						No agents match your search.
					</Card>
				) : (
					<EmptyState />
				)
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{filteredAgents.map((agent) => {
						const statusDisplay = getStatusDisplay(agent.status)
						return (
							<Card key={agent.id} className="flex flex-col">
								<CardHeader>
									<div className="flex items-start justify-between">
										<Bot className="h-8 w-8 text-violet-500" />
										<Badge variant={statusDisplay.variant} className={statusDisplay.className}>
											{statusDisplay.label}
										</Badge>
									</div>
									<CardTitle className="mt-4">{agent.name}</CardTitle>
									<CardDescription>{agent.description || 'No description'}</CardDescription>
								</CardHeader>
								<CardContent className="flex-1">
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-muted-foreground">Model:</span>
											<span className="font-medium">{getModelName(agent.model)}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Tools:</span>
											<span className="font-medium">{agent.toolIds.length}</span>
										</div>
									</div>
								</CardContent>
								<CardFooter className="flex gap-2">
									<Link href={`/dashboard/agents/${agent.id}`} className="flex-1">
										<Button variant="outline" className="w-full">
											Edit
										</Button>
									</Link>
									<Link href={`/dashboard/agents/${agent.id}/playground`} className="flex-1">
										<Button className="w-full" disabled={agent.status !== 'deployed'}>
											Test
										</Button>
									</Link>
								</CardFooter>
							</Card>
						)
					})}
				</div>
			)}
		</div>
	)
}
