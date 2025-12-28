'use client'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Plus, Search, Wrench } from 'lucide-react'
import { type ChangeEvent, useState, type ReactNode } from 'react'
import { useWorkspace } from '../../app/providers/workspace-provider'
import { useTools, type Tool } from '../../entities/tool'

export interface ToolsPageProps {
	/** Render prop for navigation links */
	renderLink: (props: { to: string; children: ReactNode; className?: string }) => ReactNode
	/** Route paths configuration */
	routes?: {
		newTool: string
		toolDetail: (id: string) => string
	}
}

const defaultRoutes = {
	newTool: '/dashboard/tools/new',
	toolDetail: (id: string) => `/dashboard/tools/${id}`,
}

function ToolCardSkeleton() {
	return (
		<Card>
			<CardContent className="p-4 sm:p-6">
				<div className="flex items-start gap-3 mb-3">
					<Skeleton className="h-10 w-10 rounded-lg" />
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-3 w-20" />
					</div>
				</div>
				<Skeleton className="h-4 w-full mb-1" />
				<Skeleton className="h-4 w-2/3" />
			</CardContent>
		</Card>
	)
}

export function ToolsPage({ renderLink, routes }: ToolsPageProps) {
	const r = routes ?? defaultRoutes
	const { activeWorkspace } = useWorkspace()
	const { data, isLoading, error } = useTools(activeWorkspace?.id)
	const [search, setSearch] = useState('')

	const tools: Tool[] = data?.tools ?? []
	const filteredTools = tools.filter(
		(tool) =>
			tool.name.toLowerCase().includes(search.toLowerCase()) ||
			tool.description?.toLowerCase().includes(search.toLowerCase()),
	)

	if (error) {
		return (
			<div className="flex-1 p-4 sm:p-6 md:p-8">
				<Card className="border-destructive">
					<CardContent className="p-6">
						<p className="text-destructive">Failed to load tools. Please try again.</p>
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
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tools</h1>
					<p className="text-muted-foreground text-sm sm:text-base mt-1">
						Manage custom tools for your agents
					</p>
				</div>
				{renderLink({
					to: r.newTool,
					className: 'w-full sm:w-auto',
					children: (
						<Button className="w-full sm:w-auto gap-2 h-11">
							<Plus className="h-4 w-4" />
							New Tool
						</Button>
					),
				})}
			</div>

			{/* Search */}
			<div className="relative w-full sm:w-64">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search tools..."
					value={search}
					onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
					className="pl-9"
				/>
			</div>

			{/* Content */}
			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<ToolCardSkeleton key={i} />
					))}
				</div>
			) : filteredTools.length === 0 && tools.length === 0 ? (
				<Card className="border-dashed border-2">
					<CardContent className="flex flex-col items-center justify-center py-12 px-4">
						<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 mb-4">
							<Wrench className="h-8 w-8 text-primary" />
						</div>
						<h3 className="text-lg font-semibold mb-2">Create your first tool</h3>
						<p className="text-muted-foreground text-center text-sm max-w-xs mb-6">
							Custom tools extend your agents with new capabilities.
						</p>
						{renderLink({
							to: r.newTool,
							className: 'w-full sm:w-auto',
							children: (
								<Button className="w-full sm:w-auto gap-2 h-11">
									<Plus className="h-4 w-4" />
									Create Tool
								</Button>
							),
						})}
					</CardContent>
				</Card>
			) : filteredTools.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12 px-4">
						<Search className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-semibold mb-2">No tools found</h3>
						<p className="text-muted-foreground text-center text-sm">
							Try adjusting your search
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredTools.map((tool) => (
						<div key={tool.id}>
							{renderLink({
								to: r.toolDetail(tool.id),
								children: (
									<Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
										<CardContent className="p-4 sm:p-6">
											<div className="flex items-start gap-3 mb-3">
												<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
													<Wrench className="h-5 w-5 text-white" />
												</div>
												<div className="flex-1 min-w-0">
													<h3 className="font-semibold text-sm sm:text-base truncate">
														{tool.name}
													</h3>
													<Badge variant="secondary" className="text-xs">
														{tool.type}
													</Badge>
												</div>
											</div>
											<p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
												{tool.description || 'No description'}
											</p>
										</CardContent>
									</Card>
								),
							})}
						</div>
					))}
				</div>
			)}
		</div>
	)
}
