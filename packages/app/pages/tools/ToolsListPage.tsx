'use client'

import { Link } from '@tanstack/react-router'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@hare/ui/components/card'
import { Input } from '@hare/ui/components/input'
import { Skeleton } from '@hare/ui/components/skeleton'
import { Code, Database, Globe, HardDrive, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import type { Tool, ToolType } from '@hare/types'
import { useToolsQuery } from '../../shared/api/hooks'
import { CreateToolDialog, DeleteToolDialog } from '../../features/create-tool'
import { useWorkspace } from '../../app/providers'

const TOOL_ICONS: Partial<Record<ToolType, typeof Wrench>> = {
	http: Globe,
	sql: Database,
	kv: HardDrive,
	r2: HardDrive,
	custom: Code,
}

function ToolCardSkeleton() {
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
				<Skeleton className="h-4 w-full" />
			</CardContent>
			<CardFooter className="flex gap-2">
				<Skeleton className="h-10 flex-1" />
				<Skeleton className="h-10 flex-1" />
			</CardFooter>
		</Card>
	)
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
	return (
		<Card className="flex flex-col items-center justify-center p-12 text-center">
			<Wrench className="h-12 w-12 text-muted-foreground mb-4" />
			<h3 className="text-lg font-semibold">No custom tools</h3>
			<p className="text-muted-foreground mt-2 mb-4">
				Create custom tools to extend your agents' capabilities.
			</p>
			<Button onClick={onAdd}>
				<Plus className="mr-2 h-4 w-4" />
				Add Tool
			</Button>
		</Card>
	)
}

export function ToolsListPage() {
	const { activeWorkspace } = useWorkspace()
	const { data, isLoading, error } = useToolsQuery(activeWorkspace?.id)

	const [search, setSearch] = useState('')
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [deleteToolId, setDeleteToolId] = useState<string | null>(null)

	const tools: Tool[] = data?.tools ?? []
	const filteredTools = tools.filter(
		(tool) =>
			tool.name.toLowerCase().includes(search.toLowerCase()) ||
			tool.description?.toLowerCase().includes(search.toLowerCase()),
	)

	const systemTools = filteredTools.filter((t) => t.isSystem)
	const customTools = filteredTools.filter((t) => !t.isSystem)

	const getToolToDelete = () => tools.find((t) => t.id === deleteToolId)

	if (error) {
		return (
			<div className="flex-1 p-8 pt-6">
				<Card className="p-6 text-center text-destructive">
					Failed to load tools: {error.message}
				</Card>
			</div>
		)
	}

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Tools</h2>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => setIsCreateOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Quick Add
					</Button>
					<Button asChild>
						<Link to="/dashboard/tools/new">
							<Globe className="mr-2 h-4 w-4" />
							Create HTTP Tool
						</Link>
					</Button>
				</div>
			</div>

			<div className="flex items-center space-x-2">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search tools..."
						className="pl-8"
						value={search}
						onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
					/>
				</div>
			</div>

			{isLoading ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{['tool-sk-1', 'tool-sk-2', 'tool-sk-3', 'tool-sk-4', 'tool-sk-5', 'tool-sk-6'].map(
						(id) => (
							<ToolCardSkeleton key={id} />
						),
					)}
				</div>
			) : (
				<>
					{/* System Tools */}
					{systemTools.length > 0 && (
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">System Tools</h3>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{systemTools.map((tool) => {
									const Icon = TOOL_ICONS[tool.type] || Wrench
									return (
										<Card key={tool.id} className="flex flex-col">
											<CardHeader>
												<div className="flex items-start justify-between">
													<Icon className="h-8 w-8 text-pink-700" />
													<Badge variant="secondary">System</Badge>
												</div>
												<CardTitle className="mt-4">{tool.name}</CardTitle>
												<CardDescription>{tool.description}</CardDescription>
											</CardHeader>
											<CardContent className="flex-1">
												<div className="space-y-2 text-sm">
													<div className="flex justify-between">
														<span className="text-muted-foreground">Type:</span>
														<span className="font-medium capitalize">{tool.type}</span>
													</div>
												</div>
											</CardContent>
											<CardFooter>
												<p className="text-xs text-muted-foreground">
													System tools are available to all agents
												</p>
											</CardFooter>
										</Card>
									)
								})}
							</div>
						</div>
					)}

					{/* Custom Tools */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Custom Tools</h3>
						{customTools.length === 0 ? (
							<EmptyState onAdd={() => setIsCreateOpen(true)} />
						) : (
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{customTools.map((tool) => {
									const Icon = TOOL_ICONS[tool.type] || Wrench
									return (
										<Card key={tool.id} className="flex flex-col">
											<CardHeader>
												<div className="flex items-start justify-between">
													<Icon className="h-8 w-8 text-pink-700" />
													<Badge>Custom</Badge>
												</div>
												<CardTitle className="mt-4">{tool.name}</CardTitle>
												<CardDescription>{tool.description || 'No description'}</CardDescription>
											</CardHeader>
											<CardContent className="flex-1">
												<div className="space-y-2 text-sm">
													<div className="flex justify-between">
														<span className="text-muted-foreground">Type:</span>
														<span className="font-medium capitalize">{tool.type}</span>
													</div>
												</div>
											</CardContent>
											<CardFooter className="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													className="flex-1"
													onClick={() => setDeleteToolId(tool.id)}
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Delete
												</Button>
											</CardFooter>
										</Card>
									)
								})}
							</div>
						)}
					</div>
				</>
			)}

			<CreateToolDialog
				workspaceId={activeWorkspace?.id}
				open={isCreateOpen}
				onOpenChange={setIsCreateOpen}
			/>

			<DeleteToolDialog
				workspaceId={activeWorkspace?.id}
				toolId={deleteToolId}
				toolName={getToolToDelete()?.name}
				onOpenChange={(open) => !open && setDeleteToolId(null)}
			/>
		</div>
	)
}
