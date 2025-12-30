'use client'

import { Link } from '@tanstack/react-router'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent } from '@hare/ui/components/card'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@hare/ui/components/collapsible'
import { Input } from '@hare/ui/components/input'
import { Skeleton } from '@hare/ui/components/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@hare/ui/components/table'
import { ChevronDown, Globe, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import type { Tool, ToolType } from '@hare/types'
import { useToolsQuery } from '../../shared/api/hooks'
import { CreateToolDialog, DeleteToolDialog } from '../../features/create-tool'
import { useWorkspace } from '../../app/providers'
import { TOOL_TYPE_ICONS } from '../../widgets/tool-picker/ui/tool-icons'

function ToolTableSkeleton() {
	return (
		<div className="space-y-2">
			{['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((id) => (
				<Skeleton key={id} className="h-12 w-full" />
			))}
		</div>
	)
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
	return (
		<Card className="border-dashed">
			<CardContent className="flex flex-col items-center justify-center py-8 text-center">
				<Wrench className="h-10 w-10 text-muted-foreground mb-3" />
				<h3 className="font-semibold">No custom tools</h3>
				<p className="text-sm text-muted-foreground mt-1 mb-4">
					Create custom tools to extend your agents' capabilities.
				</p>
				<Button size="sm" onClick={onAdd}>
					<Plus className="mr-2 h-4 w-4" />
					Add Tool
				</Button>
			</CardContent>
		</Card>
	)
}

function getToolIcon(type: ToolType) {
	return TOOL_TYPE_ICONS[type] || Wrench
}

export function ToolsListPage() {
	const { activeWorkspace } = useWorkspace()
	const { data, isLoading, error } = useToolsQuery(activeWorkspace?.id)

	const [search, setSearch] = useState('')
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [deleteToolId, setDeleteToolId] = useState<string | null>(null)
	const [systemToolsOpen, setSystemToolsOpen] = useState(true)
	const [customToolsOpen, setCustomToolsOpen] = useState(true)

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
			<div className="flex-1 p-6">
				<Card className="border-destructive">
					<CardContent className="p-4 text-center text-destructive">
						Failed to load tools: {error.message}
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex-1 space-y-6 p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Tools</h1>
					<p className="text-sm text-muted-foreground mt-1">
						{tools.length} tools available
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Quick Add
					</Button>
					<Button size="sm" asChild>
						<Link to="/dashboard/tools/new">
							<Globe className="mr-2 h-4 w-4" />
							Create HTTP Tool
						</Link>
					</Button>
				</div>
			</div>

			{/* Search */}
			<div className="relative max-w-sm">
				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search tools..."
					className="pl-8"
					value={search}
					onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
				/>
			</div>

			{isLoading ? (
				<ToolTableSkeleton />
			) : (
				<div className="space-y-4">
					{/* System Tools */}
					{systemTools.length > 0 && (
						<Collapsible open={systemToolsOpen} onOpenChange={setSystemToolsOpen}>
							<CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm font-medium hover:bg-muted transition-colors">
								<div className="flex items-center gap-2">
									<span>System Tools</span>
									<Badge variant="secondary" className="text-xs">
										{systemTools.length}
									</Badge>
								</div>
								<ChevronDown
									className={`h-4 w-4 text-muted-foreground transition-transform ${
										systemToolsOpen ? 'rotate-180' : ''
									}`}
								/>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<div className="mt-2 rounded-lg border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-[250px]">Name</TableHead>
												<TableHead className="w-[100px]">Type</TableHead>
												<TableHead>Description</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{systemTools.map((tool) => {
												const Icon = getToolIcon(tool.type)
												return (
													<TableRow key={tool.id}>
														<TableCell>
															<div className="flex items-center gap-2">
																<div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
																	<Icon className="h-4 w-4 text-muted-foreground" />
																</div>
																<span className="font-medium">{tool.name}</span>
															</div>
														</TableCell>
														<TableCell>
															<Badge variant="outline" className="text-xs capitalize">
																{tool.type}
															</Badge>
														</TableCell>
														<TableCell className="text-muted-foreground">
															<span className="line-clamp-1">{tool.description}</span>
														</TableCell>
													</TableRow>
												)
											})}
										</TableBody>
									</Table>
								</div>
							</CollapsibleContent>
						</Collapsible>
					)}

					{/* Custom Tools */}
					<Collapsible open={customToolsOpen} onOpenChange={setCustomToolsOpen}>
						<CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm font-medium hover:bg-muted transition-colors">
							<div className="flex items-center gap-2">
								<span>Custom Tools</span>
								<Badge variant="secondary" className="text-xs">
									{customTools.length}
								</Badge>
							</div>
							<ChevronDown
								className={`h-4 w-4 text-muted-foreground transition-transform ${
									customToolsOpen ? 'rotate-180' : ''
								}`}
							/>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<div className="mt-2">
								{customTools.length === 0 ? (
									<EmptyState onAdd={() => setIsCreateOpen(true)} />
								) : (
									<div className="rounded-lg border">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="w-[250px]">Name</TableHead>
													<TableHead className="w-[100px]">Type</TableHead>
													<TableHead>Description</TableHead>
													<TableHead className="w-[80px]" />
												</TableRow>
											</TableHeader>
											<TableBody>
												{customTools.map((tool) => {
													const Icon = getToolIcon(tool.type)
													return (
														<TableRow key={tool.id}>
															<TableCell>
																<div className="flex items-center gap-2">
																	<div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
																		<Icon className="h-4 w-4 text-muted-foreground" />
																	</div>
																	<span className="font-medium">{tool.name}</span>
																</div>
															</TableCell>
															<TableCell>
																<Badge variant="outline" className="text-xs capitalize">
																	{tool.type}
																</Badge>
															</TableCell>
															<TableCell className="text-muted-foreground">
																<span className="line-clamp-1">
																	{tool.description || 'No description'}
																</span>
															</TableCell>
															<TableCell>
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
																	onClick={() => setDeleteToolId(tool.id)}
																>
																	<Trash2 className="h-4 w-4" />
																</Button>
															</TableCell>
														</TableRow>
													)
												})}
											</TableBody>
										</Table>
									</div>
								)}
							</div>
						</CollapsibleContent>
					</Collapsible>
				</div>
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
