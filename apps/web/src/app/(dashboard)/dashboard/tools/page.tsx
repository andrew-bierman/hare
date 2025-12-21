'use client'

import { Code, Database, Globe, HardDrive, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@workspace/ui/components/select'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Textarea } from '@workspace/ui/components/textarea'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import {
	useTools,
	useCreateTool,
	useDeleteTool,
	TOOL_TYPES,
	type ToolType,
	type Tool,
} from 'web-app/lib/api/hooks'

const TOOL_ICONS: Record<ToolType, typeof Wrench> = {
	http: Globe,
	sql: Database,
	kv: HardDrive,
	r2: HardDrive,
	vectorize: Search,
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

export default function ToolsPage() {
	const { activeWorkspace } = useWorkspace()
	const { data, isLoading, error } = useTools(activeWorkspace?.id)
	const createTool = useCreateTool(activeWorkspace?.id)
	const deleteTool = useDeleteTool(activeWorkspace?.id)

	const [search, setSearch] = useState('')
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [deleteToolId, setDeleteToolId] = useState<string | null>(null)

	// Create form state
	const [newName, setNewName] = useState('')
	const [newDescription, setNewDescription] = useState('')
	const [newType, setNewType] = useState<ToolType>('http')
	const [newConfig, setNewConfig] = useState('')

	const tools: Tool[] = data?.tools ?? []
	const filteredTools = tools.filter(
		(tool) =>
			tool.name.toLowerCase().includes(search.toLowerCase()) ||
			tool.description?.toLowerCase().includes(search.toLowerCase())
	)

	const systemTools = filteredTools.filter((t) => t.isSystem)
	const customTools = filteredTools.filter((t) => !t.isSystem)

	const handleCreate = async () => {
		if (!newName.trim()) {
			toast.error('Please enter a tool name')
			return
		}

		try {
			let config: Record<string, unknown> | undefined
			if (newConfig.trim()) {
				try {
					config = JSON.parse(newConfig)
				} catch {
					toast.error('Invalid JSON configuration')
					return
				}
			}

			await createTool.mutateAsync({
				name: newName.trim(),
				description: newDescription.trim() || undefined,
				type: newType,
				config,
			})

			toast.success('Tool created successfully')
			setIsCreateOpen(false)
			resetCreateForm()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create tool')
		}
	}

	const handleDelete = async () => {
		if (!deleteToolId) return

		try {
			await deleteTool.mutateAsync(deleteToolId)
			toast.success('Tool deleted')
			setDeleteToolId(null)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete tool')
		}
	}

	const resetCreateForm = () => {
		setNewName('')
		setNewDescription('')
		setNewType('http')
		setNewConfig('')
	}

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
				<Button onClick={() => setIsCreateOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Add Tool
				</Button>
			</div>

			<div className="flex items-center space-x-2">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search tools..."
						className="pl-8"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
			</div>

			{isLoading ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{[...Array(6)].map((_, i) => (
						<ToolCardSkeleton key={i} />
					))}
				</div>
			) : (
				<>
					{/* System Tools */}
					{systemTools.length > 0 && (
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">System Tools</h3>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{systemTools.map((tool: Tool) => {
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
								{customTools.map((tool: Tool) => {
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

			{/* Create Tool Dialog */}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Tool</DialogTitle>
						<DialogDescription>
							Create a custom tool to extend your agents' capabilities.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="tool-name">Name *</Label>
							<Input
								id="tool-name"
								placeholder="My Custom Tool"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="tool-description">Description</Label>
							<Textarea
								id="tool-description"
								placeholder="What does this tool do?"
								value={newDescription}
								onChange={(e) => setNewDescription(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="tool-type">Type</Label>
							<Select value={newType} onValueChange={(v) => setNewType(v as ToolType)}>
								<SelectTrigger id="tool-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TOOL_TYPES.map((type) => (
										<SelectItem key={type.value} value={type.value}>
											<div className="flex flex-col">
												<span>{type.label}</span>
												<span className="text-xs text-muted-foreground">{type.description}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="tool-config">Configuration (JSON)</Label>
							<Textarea
								id="tool-config"
								placeholder='{"url": "https://api.example.com"}'
								className="font-mono text-sm"
								value={newConfig}
								onChange={(e) => setNewConfig(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsCreateOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleCreate} disabled={createTool.isPending || !newName.trim()}>
							{createTool.isPending ? 'Creating...' : 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={!!deleteToolId} onOpenChange={() => setDeleteToolId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Tool</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{getToolToDelete()?.name}"? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteToolId(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteTool.isPending}
						>
							{deleteTool.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
