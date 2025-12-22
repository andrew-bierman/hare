'use client'

import { useParams, useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Rocket, Trash2 } from 'lucide-react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { AgentInstructionsEditor } from 'web-app/components/agent/agent-instructions-editor'
import { ToolPicker } from 'web-app/components/agent/tool-picker'
import {
	useAgent,
	useUpdateAgent,
	useDeleteAgent,
	useDeployAgent,
	useTools,
	useAgentUsage,
	AVAILABLE_MODELS,
	type Tool,
} from 'web-app/lib/api/hooks'

function LoadingSkeleton() {
	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-9 w-64" />
					<Skeleton className="h-5 w-96" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-32" />
				</div>
			</div>
			<Skeleton className="h-10 w-80" />
			<div className="grid gap-4 md:grid-cols-3">
				<div className="md:col-span-2">
					<Skeleton className="h-64 w-full" />
				</div>
				<Skeleton className="h-48 w-full" />
			</div>
		</div>
	)
}

export default function AgentBuilderPage() {
	const params = useParams()
	const router = useRouter()
	const agentId = params.id as string

	const { activeWorkspace } = useWorkspace()
	const { data: agent, isLoading, error } = useAgent(agentId, activeWorkspace?.id)
	const { data: toolsData } = useTools(activeWorkspace?.id)
	const { data: usageData } = useAgentUsage(agentId, activeWorkspace?.id)
	const updateAgent = useUpdateAgent(activeWorkspace?.id)
	const deleteAgent = useDeleteAgent(activeWorkspace?.id)
	const deployAgent = useDeployAgent(activeWorkspace?.id)

	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [model, setModel] = useState('')
	const [instructions, setInstructions] = useState('')
	const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
	const [isDeleteOpen, setIsDeleteOpen] = useState(false)
	const [hasChanges, setHasChanges] = useState(false)

	const tools = toolsData?.tools ?? []

	// Initialize form with agent data
	useEffect(() => {
		if (agent) {
			setName(agent.name)
			setDescription(agent.description || '')
			setModel(agent.model)
			setInstructions(agent.instructions || '')
			setSelectedToolIds(agent.toolIds || [])
		}
	}, [agent])

	// Track changes
	useEffect(() => {
		if (agent) {
			const changed =
				name !== agent.name ||
				description !== (agent.description || '') ||
				model !== agent.model ||
				instructions !== (agent.instructions || '') ||
				JSON.stringify(selectedToolIds.sort()) !== JSON.stringify((agent.toolIds || []).sort())
			setHasChanges(changed)
		}
	}, [agent, name, description, model, instructions, selectedToolIds])

	const handleSave = async () => {
		try {
			await updateAgent.mutateAsync({
				id: agentId,
				data: {
					name: name.trim(),
					description: description.trim() || undefined,
					model,
					instructions: instructions.trim() || undefined,
					toolIds: selectedToolIds,
				},
			})
			toast.success('Agent updated successfully')
			setHasChanges(false)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update agent')
		}
	}

	const handleDelete = async () => {
		try {
			await deleteAgent.mutateAsync(agentId)
			toast.success('Agent deleted')
			router.push('/dashboard/agents')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete agent')
		}
	}

	const handleDeploy = async () => {
		if (!instructions.trim()) {
			toast.error('Please add a system prompt before deploying')
			return
		}

		try {
			// Save any pending changes first
			if (hasChanges) {
				await handleSave()
			}
			await deployAgent.mutateAsync({ id: agentId })
			toast.success('Agent deployed successfully')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to deploy agent')
		}
	}

	const getStatusDisplay = (status: string) => {
		switch (status) {
			case 'deployed':
				return { label: 'Deployed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' }
			case 'draft':
				return { label: 'Draft', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' }
			case 'archived':
				return { label: 'Archived', className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' }
			default:
				return { label: status, className: '' }
		}
	}

	if (isLoading) {
		return <LoadingSkeleton />
	}

	if (error || !agent) {
		return (
			<div className="flex-1 p-8 pt-6">
				<Card className="p-6 text-center">
					<p className="text-destructive">
						{error?.message || 'Agent not found'}
					</p>
					<Button className="mt-4" onClick={() => router.push('/dashboard/agents')}>
						Back to Agents
					</Button>
				</Card>
			</div>
		)
	}

	const statusDisplay = getStatusDisplay(agent.status)

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-3xl font-bold tracking-tight">{agent.name}</h2>
						<Badge className={statusDisplay.className}>{statusDisplay.label}</Badge>
					</div>
					<p className="text-muted-foreground mt-2">Configure your agent's settings and behavior</p>
				</div>
				<div className="flex gap-2">
					{agent.status !== 'deployed' && (
						<Button
							variant="outline"
							onClick={handleDeploy}
							disabled={deployAgent.isPending || !instructions.trim()}
						>
							<Rocket className="mr-2 h-4 w-4" />
							{deployAgent.isPending ? 'Deploying...' : 'Deploy'}
						</Button>
					)}
					<Button variant="outline" onClick={() => setIsDeleteOpen(true)}>
						<Trash2 className="mr-2 h-4 w-4" />
						Delete
					</Button>
					<Button onClick={handleSave} disabled={updateAgent.isPending || !hasChanges}>
						{updateAgent.isPending ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</div>

			<Tabs defaultValue="general" className="space-y-4">
				<TabsList>
					<TabsTrigger value="general">General</TabsTrigger>
					<TabsTrigger value="prompt">Prompt</TabsTrigger>
					<TabsTrigger value="tools">Tools</TabsTrigger>
					<TabsTrigger value="analytics">Analytics</TabsTrigger>
				</TabsList>

				<TabsContent value="general" className="space-y-4">
					<div className="grid gap-4 md:grid-cols-3">
						<div className="md:col-span-2 space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Basic Information</CardTitle>
									<CardDescription>Configure your agent's identity and purpose</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="name">Agent Name</Label>
										<Input
											id="name"
											value={name}
											onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="description">Description</Label>
										<Textarea
											id="description"
											value={description}
											onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
											className="h-24"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="model">Model</Label>
										<Select value={model} onValueChange={setModel}>
											<SelectTrigger id="model">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{AVAILABLE_MODELS.map((m) => (
													<SelectItem key={m.id} value={m.id}>
														<div className="flex flex-col">
															<span>{m.name}</span>
															<span className="text-xs text-muted-foreground">{m.description}</span>
														</div>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</CardContent>
							</Card>
						</div>

						<div className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Statistics</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<div className="text-2xl font-bold">
											{usageData?.totalCalls?.toLocaleString() ?? 0}
										</div>
										<p className="text-xs text-muted-foreground">Total messages</p>
									</div>
									<div>
										<div className="text-2xl font-bold">
											{usageData?.totalTokens?.toLocaleString() ?? 0}
										</div>
										<p className="text-xs text-muted-foreground">Tokens used</p>
									</div>
									<div>
										<div className="text-2xl font-bold">{selectedToolIds.length}</div>
										<p className="text-xs text-muted-foreground">Tools enabled</p>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Quick Actions</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<Button
										variant="outline"
										className="w-full"
										onClick={() => router.push(`/dashboard/agents/${agentId}/playground`)}
										disabled={agent.status !== 'deployed'}
									>
										Test in Playground
									</Button>
								</CardContent>
							</Card>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="prompt" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>System Prompt</CardTitle>
							<CardDescription>
								Define how your agent behaves and responds. Use Markdown formatting and template variables like {'{'}{'{'} user_name {'}'}{'}'}  for dynamic content.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="system-prompt">System Prompt</Label>
								<AgentInstructionsEditor
									value={instructions}
									onChange={setInstructions}
									disabled={updateAgent.isPending}
									placeholder="You are a helpful assistant that..."
								/>
								<p className="text-xs text-muted-foreground">
									This prompt will be sent with every conversation to guide the agent's behavior.
									Required for deployment.
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="tools" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Agent Tools</CardTitle>
							<CardDescription>
								Select and configure tools to extend your agent's capabilities.
								Drag to reorder tool priority.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ToolPicker
								workspaceId={activeWorkspace?.id || ''}
								selectedToolIds={selectedToolIds}
								onSelectionChange={setSelectedToolIds}
								maxTools={20}
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="analytics" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Usage Analytics</CardTitle>
							<CardDescription>Monitor your agent's performance over time</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-3">
								<div className="p-4 border rounded-lg">
									<div className="text-2xl font-bold">
										{usageData?.totalCalls?.toLocaleString() ?? 0}
									</div>
									<p className="text-sm text-muted-foreground">Total API Calls</p>
								</div>
								<div className="p-4 border rounded-lg">
									<div className="text-2xl font-bold">
										{usageData?.inputTokens?.toLocaleString() ?? 0}
									</div>
									<p className="text-sm text-muted-foreground">Input Tokens</p>
								</div>
								<div className="p-4 border rounded-lg">
									<div className="text-2xl font-bold">
										{usageData?.outputTokens?.toLocaleString() ?? 0}
									</div>
									<p className="text-sm text-muted-foreground">Output Tokens</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Agent</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{agent.name}"? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteAgent.isPending}
						>
							{deleteAgent.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
