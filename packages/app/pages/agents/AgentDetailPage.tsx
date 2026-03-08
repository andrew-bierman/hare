'use client'

import { useWorkspace } from '../../app/providers'
import {
	useAgentQuery,
	useAgentUsageQuery,
	useCloneAgentMutation,
	useDeleteAgentMutation,
	useDeployAgentMutation,
	useToolsQuery,
	useUpdateAgentMutation,
} from '../../shared/api'

import { AgentHealthWidget } from '../../widgets/agent-health'
import { AgentInstructionsEditor } from '../../widgets/agent-builder'
import { MemoryViewer } from '../../widgets/memory-viewer'
import { ScheduledTasksSection } from '../../widgets/scheduled-tasks'
import { ToolPicker } from '../../widgets/tool-picker'
import { VersionHistory } from '../../widgets/version-history'
import { config } from '@hare/config'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hare/ui/components/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@hare/ui/components/dialog'
import { Input } from '@hare/ui/components/input'
import { Label } from '@hare/ui/components/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@hare/ui/components/select'
import { Skeleton } from '@hare/ui/components/skeleton'
import { Switch } from '@hare/ui/components/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hare/ui/components/tabs'
import { Textarea } from '@hare/ui/components/textarea'
import { useNavigate } from '@tanstack/react-router'
import {
	AlertTriangle,
	Copy,
	MessageSquare,
	Play,
	Rocket,
	Trash2,
} from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

export interface AgentDetailPageProps {
	agentId: string
	basePath?: string // Base path for agent routes, defaults to '/dashboard/agents'
}

// Local references for cleaner code
const AGENT_LIMITS = config.agents.limits
const AI_MODELS = config.models.list

// Validation schema for agent configuration (client-side quick validation)
// Note: Instructions are optional for saving, but required for deployment
const agentConfigSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.max(
			AGENT_LIMITS.nameMaxLength,
			`Name must be at most ${AGENT_LIMITS.nameMaxLength} characters`,
		),
	description: z
		.string()
		.max(
			AGENT_LIMITS.descriptionMaxLength,
			`Description must be at most ${AGENT_LIMITS.descriptionMaxLength} characters`,
		)
		.optional()
		.or(z.literal('')),
	instructions: z
		.string()
		.max(
			AGENT_LIMITS.instructionsMaxLength,
			`Instructions must be at most ${AGENT_LIMITS.instructionsMaxLength} characters`,
		)
		.optional()
		.or(z.literal('')),
	model: z.string().min(1, 'Model is required'),
})

// Type for validation errors (merged from client + server)
type ValidationErrors = {
	name?: string
	description?: string
	instructions?: string
	model?: string
	'config.temperature'?: string
	'config.maxTokens'?: string
	toolIds?: string
}

// Type for validation warnings (merged from client + server)
type ValidationWarnings = {
	tools?: string
	model?: string
	instructions?: string
	'config.temperature'?: string
}

// Helper function to estimate token count (rough approximation: ~4 chars per token)
function estimateTokenCount(text: string): number {
	if (!text) return 0
	return Math.ceil(text.length / 4)
}

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

export function AgentDetailPage({
	agentId,
	basePath = '/dashboard/agents',
}: AgentDetailPageProps) {
	const navigate = useNavigate()

	const { activeWorkspace } = useWorkspace()
	const { data: agent, isLoading, error } = useAgentQuery(agentId)
	useToolsQuery()
	const { data: usageData } = useAgentUsageQuery(agentId)
	const updateAgent = useUpdateAgentMutation()
	const deleteAgent = useDeleteAgentMutation()
	const deployAgent = useDeployAgentMutation()
	const cloneAgentMutation = useCloneAgentMutation()

	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [model, setModel] = useState('')
	const [instructions, setInstructions] = useState('')
	const [systemToolsEnabled, setSystemToolsEnabled] = useState(true)
	const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
	const [isDeleteOpen, setIsDeleteOpen] = useState(false)
	const [isCloneOpen, setIsCloneOpen] = useState(false)
	const [hasChanges, setHasChanges] = useState(false)
	const [clientValidationErrors, setClientValidationErrors] = useState<ValidationErrors>({})
	const [clientValidationWarnings, setClientValidationWarnings] = useState<ValidationWarnings>({})

	// Use client-side validation only (server-side preview not available in oRPC)
	const validationErrors = clientValidationErrors
	const validationWarnings = clientValidationWarnings

	// Initialize form with agent data
	useEffect(() => {
		if (agent) {
			setName(agent.name)
			setDescription(agent.description || '')
			setModel(agent.model)
			setInstructions(agent.instructions || '')
			setSystemToolsEnabled(agent.systemToolsEnabled)
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
				systemToolsEnabled !== agent.systemToolsEnabled ||
				JSON.stringify(selectedToolIds.sort()) !== JSON.stringify((agent.toolIds || []).sort())
			setHasChanges(changed)
		}
	}, [agent, name, description, model, instructions, systemToolsEnabled, selectedToolIds])

	// Client-side validation (immediate feedback)
	useEffect(() => {
		const result = agentConfigSchema.safeParse({
			name,
			description,
			instructions,
			model,
		})

		if (!result.success) {
			const errors: ValidationErrors = {}
			for (const issue of result.error.issues) {
				const field = issue.path[0] as keyof ValidationErrors
				if (field) {
					errors[field] = issue.message
				}
			}
			setClientValidationErrors(errors)
		} else {
			setClientValidationErrors({})
		}

		// Check for warnings (tools)
		const warnings: ValidationWarnings = {}
		if (selectedToolIds.length === 0 && !systemToolsEnabled) {
			warnings.tools = 'No tools selected. Your agent may have limited capabilities.'
		}
		setClientValidationWarnings(warnings)
	}, [name, description, instructions, model, selectedToolIds, systemToolsEnabled])

	// Check if model is valid
	const isValidModel = useMemo(() => {
		return AI_MODELS.some((m) => m.id === model)
	}, [model])

	// Check if there are any validation errors
	const hasValidationErrors = useMemo(() => {
		return Object.keys(validationErrors).length > 0 || (!isValidModel && model !== '')
	}, [validationErrors, isValidModel, model])

	// Estimate token count for system prompt
	const estimatedTokens = useMemo(() => {
		return estimateTokenCount(instructions)
	}, [instructions])



	const handleSave = async () => {
		try {
			await updateAgent.mutateAsync({
				id: agentId,
				name: name.trim(),
				description: description.trim() || undefined,
				model,
				instructions: instructions.trim() || undefined,
				systemToolsEnabled,
				toolIds: selectedToolIds,
			})
			toast.success('Agent updated successfully')
			setHasChanges(false)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update agent')
		}
	}

	const handleDelete = async () => {
		try {
			await deleteAgent.mutateAsync({ id: agentId })
			toast.success('Agent deleted')
			navigate({ to: basePath })
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

	const handleClone = async () => {
		try {
			const result = await cloneAgentMutation.mutateAsync({ id: agentId })
			setIsCloneOpen(false)
			toast.success('Agent cloned successfully', {
				description: `${agent?.name} (Copy) has been created`,
				action: {
					label: 'View Agent',
					onClick: () => {
						navigate({ to: result.redirectUrl })
					},
				},
			})
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to clone agent')
		}
	}

	const getStatusDisplay = (status: string) => {
		switch (status) {
			case 'deployed':
				return {
					label: 'Deployed',
					className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
				}
			case 'draft':
				return {
					label: 'Draft',
					className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
				}
			case 'archived':
				return {
					label: 'Archived',
					className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
				}
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
					<p className="text-destructive">{error?.message || 'Agent not found'}</p>
					<Button className="mt-4" onClick={() => navigate({ to: basePath })}>
						Back to Agents
					</Button>
				</Card>
			</div>
		)
	}

	const statusDisplay = getStatusDisplay(agent.status)

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-start justify-between gap-6">
				<div className="flex-1">
					<div className="flex items-center gap-3">
						<h2 className="text-3xl font-bold tracking-tight">{agent.name}</h2>
						<Badge className={statusDisplay.className}>{statusDisplay.label}</Badge>
					</div>
					<p className="text-muted-foreground mt-2">Configure your agent's settings and behavior</p>
				</div>
				<div className="w-72 shrink-0">
					<AgentHealthWidget agentId={agentId} basePath={basePath} />
				</div>
				<div className="flex gap-2 shrink-0">
					{/* Primary actions */}
					{agent.status === 'deployed' && (
						<Button
							className="gap-2"
							onClick={() => navigate({ to: `${basePath}/${agentId}/playground` })}
						>
							<Play className="h-4 w-4" />
							Test Agent
						</Button>
					)}
					{agent.status !== 'deployed' && (
						<Button
							onClick={handleDeploy}
							disabled={deployAgent.isPending || !instructions.trim()}
							className="gap-2"
						>
							<Rocket className="h-4 w-4" />
							{deployAgent.isPending ? 'Deploying...' : 'Deploy'}
						</Button>
					)}
					<Button
						onClick={handleSave}
						variant={agent.status === 'deployed' ? 'default' : 'secondary'}
						disabled={updateAgent.isPending || !hasChanges || hasValidationErrors}
					>
						{updateAgent.isPending ? 'Saving...' : 'Save Changes'}
					</Button>
					{/* Secondary actions */}
					<Button
						variant="outline"
						size="icon"
						onClick={() => setIsCloneOpen(true)}
						title="Clone Agent"
					>
						<Copy className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => setIsDeleteOpen(true)}
						title="Delete Agent"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<Tabs defaultValue="general" className="space-y-4">
				<TabsList>
					<TabsTrigger value="general">General</TabsTrigger>
					<TabsTrigger value="prompt">Prompt</TabsTrigger>
					<TabsTrigger value="tools">Tools</TabsTrigger>
					<TabsTrigger value="memory">Memory</TabsTrigger>
					<TabsTrigger value="schedules">Schedules</TabsTrigger>
					<TabsTrigger value="versions">Version History</TabsTrigger>
					<TabsTrigger value="preview">Preview</TabsTrigger>
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
											className={validationErrors.name ? 'border-destructive' : ''}
										/>
										{validationErrors.name && (
											<p className="text-sm text-destructive">{validationErrors.name}</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="description">Description</Label>
										<Textarea
											id="description"
											value={description}
											onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
												setDescription(e.target.value)
											}
											className={`h-24 ${validationErrors.description ? 'border-destructive' : ''}`}
										/>
										{validationErrors.description && (
											<p className="text-sm text-destructive">{validationErrors.description}</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="model">Model</Label>
										<Select value={model} onValueChange={setModel}>
											<SelectTrigger
												id="model"
												className={
													validationErrors.model || (!isValidModel && model !== '')
														? 'border-destructive'
														: ''
												}
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{AI_MODELS.map((m) => (
													<SelectItem key={m.id} value={m.id}>
														<div className="flex flex-col">
															<span>{m.name}</span>
															<span className="text-xs text-muted-foreground">{m.description}</span>
														</div>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{validationErrors.model && (
											<p className="text-sm text-destructive">{validationErrors.model}</p>
										)}
										{!isValidModel && model !== '' && !validationErrors.model && (
											<p className="text-sm text-destructive">
												Selected model is not in the list of available models
											</p>
										)}
									</div>
								</CardContent>
							</Card>
						</div>

						<div className="space-y-4">
							{/* Quick Actions Card */}
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-base">Quick Actions</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{agent.status === 'deployed' ? (
										<Button
											variant="outline"
											className="w-full justify-start gap-2"
											onClick={() => navigate({ to: `${basePath}/${agentId}/playground` })}
										>
											<MessageSquare className="h-4 w-4" />
											Open Playground
										</Button>
									) : (
										<Button
											variant="outline"
											className="w-full justify-start gap-2"
											onClick={handleDeploy}
											disabled={deployAgent.isPending || !instructions.trim()}
										>
											<Rocket className="h-4 w-4" />
											Deploy to Test
										</Button>
									)}
								</CardContent>
							</Card>

							{/* Statistics Card */}
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-base">Statistics</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex justify-between items-center">
										<span className="text-sm text-muted-foreground">Messages</span>
										<span className="text-sm font-medium">
											{usageData?.usage?.totalMessages?.toLocaleString() ?? 0}
										</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm text-muted-foreground">Tokens</span>
										<span className="text-sm font-medium">
											{(
												(usageData?.usage?.totalTokensIn ?? 0) +
												(usageData?.usage?.totalTokensOut ?? 0)
											).toLocaleString()}
										</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm text-muted-foreground">Tools</span>
										<span className="text-sm font-medium">{selectedToolIds.length}</span>
									</div>
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
								Define how your agent behaves and responds. Use Markdown formatting and template
								variables like {'{'}
								{'{'} user_name {'}'}
								{'}'} for dynamic content.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="system-prompt">System Prompt</Label>
									<span className="text-xs text-muted-foreground">
										~{estimatedTokens.toLocaleString()} tokens
									</span>
								</div>
								<AgentInstructionsEditor
									value={instructions}
									onChange={setInstructions}
									disabled={updateAgent.isPending}
									placeholder="You are a helpful assistant that..."
								/>
								{validationErrors.instructions && (
									<p className="text-sm text-destructive">{validationErrors.instructions}</p>
								)}
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
								Select and configure tools to extend your agent's capabilities. Drag to reorder tool
								priority.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between rounded-lg border p-4">
								<div className="space-y-0.5">
									<Label htmlFor="system-tools" className="text-base">
										Include System Tools
									</Label>
									<p className="text-sm text-muted-foreground">
										Adds 50+ built-in tools for storage, HTTP, AI, data processing, and more.
									</p>
								</div>
								<Switch
									id="system-tools"
									checked={systemToolsEnabled}
									onCheckedChange={setSystemToolsEnabled}
								/>
							</div>

							{validationWarnings.tools && (
								<div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
									<AlertTriangle className="h-4 w-4 flex-shrink-0" />
									<span>{validationWarnings.tools}</span>
								</div>
							)}

							<div className="space-y-2">
								<Label className="text-sm font-medium">Custom Tools</Label>
								<ToolPicker
									selectedToolIds={selectedToolIds}
									onSelectionChange={setSelectedToolIds}
									maxTools={20}
								/>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="memory" className="space-y-4">
					<MemoryViewer agentId={agentId} />
				</TabsContent>

				<TabsContent value="schedules" className="space-y-4">
					{activeWorkspace?.id && (
						<ScheduledTasksSection agentId={agentId} />
					)}
				</TabsContent>

				<TabsContent value="versions" className="space-y-4">
					<VersionHistory agentId={agentId} />
				</TabsContent>

				<TabsContent value="preview" className="space-y-4">
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-16 text-center">
							{agent.status === 'deployed' ? (
								<>
									<MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
									<h3 className="text-lg font-semibold mb-2">Test your agent</h3>
									<p className="text-sm text-muted-foreground mb-6 max-w-md">
										Open the chat playground to send messages and test how your agent responds.
									</p>
									<Button
										className="gap-2"
										onClick={() => navigate({ to: `${basePath}/${agentId}/playground` })}
									>
										<Play className="h-4 w-4" />
										Open Chat Playground
									</Button>
								</>
							) : (
								<>
									<Rocket className="h-12 w-12 text-muted-foreground mb-4" />
									<h3 className="text-lg font-semibold mb-2">Deploy to preview</h3>
									<p className="text-sm text-muted-foreground mb-6 max-w-md">
										Deploy your agent first to test it in the chat playground.
									</p>
									<Button
										className="gap-2"
										onClick={handleDeploy}
										disabled={deployAgent.isPending || !instructions.trim()}
									>
										<Rocket className="h-4 w-4" />
										{deployAgent.isPending ? 'Deploying...' : 'Deploy Agent'}
									</Button>
								</>
							)}
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
										{usageData?.usage?.totalMessages?.toLocaleString() ?? 0}
									</div>
									<p className="text-sm text-muted-foreground">Total API Calls</p>
								</div>
								<div className="p-4 border rounded-lg">
									<div className="text-2xl font-bold">
										{usageData?.usage?.totalTokensIn?.toLocaleString() ?? 0}
									</div>
									<p className="text-sm text-muted-foreground">Input Tokens</p>
								</div>
								<div className="p-4 border rounded-lg">
									<div className="text-2xl font-bold">
										{usageData?.usage?.totalTokensOut?.toLocaleString() ?? 0}
									</div>
									<p className="text-sm text-muted-foreground">Output Tokens</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Clone Confirmation Dialog */}
			<Dialog open={isCloneOpen} onOpenChange={setIsCloneOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Clone Agent</DialogTitle>
						<DialogDescription>
							Create a copy of "{agent.name}" as a new agent?
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<p className="text-sm text-muted-foreground">The new agent will be named:</p>
						<p className="text-sm font-medium mt-1">{agent.name} (Copy)</p>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsCloneOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleClone} disabled={cloneAgentMutation.isPending}>
							<Copy className="mr-2 h-4 w-4" />
							{cloneAgentMutation.isPending ? 'Cloning...' : 'Clone Agent'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

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
						<Button variant="destructive" onClick={handleDelete} disabled={deleteAgent.isPending}>
							{deleteAgent.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
