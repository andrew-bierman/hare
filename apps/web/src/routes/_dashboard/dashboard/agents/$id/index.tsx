import { AGENT_LIMITS, AI_MODELS } from '@hare/app/shared/config'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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
import {
	AlertTriangle,
	Brain,
	CheckCircle,
	Code,
	CodeXml,
	Database,
	FileCode,
	Globe,
	HardDrive,
	Layers,
	Plug,
	RefreshCw,
	Rocket,
	Search,
	Trash2,
	Wrench,
} from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AgentInstructionsEditor } from 'web-app/components/agent/agent-instructions-editor'
import { MemoryViewer } from 'web-app/components/agent/memory-viewer'
import { ScheduledTasksSection } from 'web-app/components/agent/scheduled-tasks-section'
import { ToolPicker } from 'web-app/components/agent/tool-picker'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import {
	useAgent,
	useAgentPreviewQuery,
	useAgentUsage,
	useDeleteAgent,
	useDeployAgent,
	useTools,
	useUpdateAgent,
	type ValidationIssue,
} from 'web-app/lib/api/hooks'
import { useDebouncedValue } from 'web-app/lib/hooks/use-debounce'
import { z } from 'zod'

export const Route = createFileRoute('/_dashboard/dashboard/agents/$id/')({
	component: AgentBuilderPage,
})

// Validation schema for agent configuration (client-side quick validation)
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
		.min(1, 'Instructions are required')
		.max(
			AGENT_LIMITS.instructionsMaxLength,
			`Instructions must be at most ${AGENT_LIMITS.instructionsMaxLength} characters`,
		),
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

// Helper to convert server validation issues to error/warning maps
function processServerValidation(issues: ValidationIssue[]): {
	errors: ValidationErrors
	warnings: ValidationWarnings
} {
	const errors: ValidationErrors = {}
	const warnings: ValidationWarnings = {}

	for (const issue of issues) {
		if (issue.type === 'error') {
			errors[issue.field as keyof ValidationErrors] = issue.message
		} else {
			warnings[issue.field as keyof ValidationWarnings] = issue.message
		}
	}

	return { errors, warnings }
}

// Tool category icons mapping
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
	storage: HardDrive,
	database: Database,
	http: Globe,
	search: Search,
	ai: Brain,
	utility: Wrench,
	integrations: Plug,
	data: FileCode,
	sandbox: Code,
	validation: CheckCircle,
	transform: RefreshCw,
	all: Layers,
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

function AgentBuilderPage() {
	const { id: agentId } = Route.useParams()
	const navigate = useNavigate()

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
	const [clientValidationErrors, setClientValidationErrors] = useState<ValidationErrors>({})
	const [clientValidationWarnings, setClientValidationWarnings] = useState<ValidationWarnings>({})

	const tools = toolsData?.tools ?? []

	// Debounce values for server validation to avoid too many API calls
	const debouncedOverrides = useDebouncedValue(
		{
			name,
			description: description || undefined,
			model,
			instructions,
			toolIds: selectedToolIds,
		},
		800, // Wait 800ms after user stops typing
	)

	// Server-side preview validation query
	const { data: serverPreview, isLoading: isValidating } = useAgentPreviewQuery({
		agentId,
		workspaceId: activeWorkspace?.id,
		overrides: debouncedOverrides,
		enabled: !!agentId && !!activeWorkspace?.id && hasChanges,
	})

	// Process server validation results
	const serverValidation = useMemo(() => {
		if (!serverPreview) return { errors: {}, warnings: {} }
		return processServerValidation([...serverPreview.errors, ...serverPreview.warnings])
	}, [serverPreview])

	// Merge client and server validation errors/warnings
	const validationErrors = useMemo(() => {
		return { ...clientValidationErrors, ...serverValidation.errors }
	}, [clientValidationErrors, serverValidation.errors])

	const validationWarnings = useMemo(() => {
		return { ...clientValidationWarnings, ...serverValidation.warnings }
	}, [clientValidationWarnings, serverValidation.warnings])

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
		if (selectedToolIds.length === 0) {
			warnings.tools = 'No tools selected. Your agent may have limited capabilities.'
		}
		setClientValidationWarnings(warnings)
	}, [name, description, instructions, model, selectedToolIds])

	// Check if model is valid
	const isValidModel = useMemo(() => {
		return AI_MODELS.some((m) => m.id === model)
	}, [model])

	// Check if there are any validation errors
	const hasValidationErrors = useMemo(() => {
		return Object.keys(validationErrors).length > 0 || (!isValidModel && model !== '')
	}, [validationErrors, isValidModel, model])

	// Get selected tools with their details
	const selectedTools = useMemo(() => {
		return tools.filter((tool) => selectedToolIds.includes(tool.id))
	}, [tools, selectedToolIds])

	// Group selected tools by category/type
	const toolsByCategory = useMemo(() => {
		const grouped: Record<string, typeof tools> = {}
		for (const tool of selectedTools) {
			const category = tool.type || 'utility'
			if (!grouped[category]) {
				grouped[category] = []
			}
			grouped[category].push(tool)
		}
		return grouped
	}, [selectedTools])

	// Estimate token count for system prompt
	const estimatedTokens = useMemo(() => {
		return estimateTokenCount(instructions)
	}, [instructions])

	// Get model display name
	const selectedModel = useMemo(() => {
		return AI_MODELS.find((m) => m.id === model)
	}, [model])

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
			navigate({ to: '/dashboard/agents' })
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
					<Button className="mt-4" onClick={() => navigate({ to: '/dashboard/agents' })}>
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
					<Link to="/dashboard/agents/$id/embed" params={{ id: agentId }}>
						<Button variant="outline">
							<CodeXml className="mr-2 h-4 w-4" />
							Embed
						</Button>
					</Link>
					<Button variant="outline" onClick={() => setIsDeleteOpen(true)}>
						<Trash2 className="mr-2 h-4 w-4" />
						Delete
					</Button>
					<Button
						onClick={handleSave}
						disabled={updateAgent.isPending || !hasChanges || hasValidationErrors}
					>
						{updateAgent.isPending ? 'Saving...' : 'Save Changes'}
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
							{validationWarnings.tools && (
								<div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
									<AlertTriangle className="h-4 w-4 flex-shrink-0" />
									<span>{validationWarnings.tools}</span>
								</div>
							)}
							<ToolPicker
								workspaceId={activeWorkspace?.id || ''}
								selectedToolIds={selectedToolIds}
								onSelectionChange={setSelectedToolIds}
								maxTools={20}
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="memory" className="space-y-4">
					{activeWorkspace?.id && (
						<MemoryViewer agentId={agentId} workspaceId={activeWorkspace.id} />
					)}
				</TabsContent>

				<TabsContent value="schedules" className="space-y-4">
					{activeWorkspace?.id && (
						<ScheduledTasksSection agentId={agentId} workspaceId={activeWorkspace.id} />
					)}
				</TabsContent>

				<TabsContent value="preview" className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						{/* Configuration Summary */}
						<Card>
							<CardHeader>
								<CardTitle>Configuration Summary</CardTitle>
								<CardDescription>Overview of your agent configuration</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-3">
									<div className="flex justify-between items-start border-b pb-2">
										<span className="text-sm text-muted-foreground">Name</span>
										<span className="text-sm font-medium text-right max-w-[60%] truncate">
											{name || '-'}
										</span>
									</div>
									<div className="flex justify-between items-start border-b pb-2">
										<span className="text-sm text-muted-foreground">Model</span>
										<span className="text-sm font-medium text-right">
											{selectedModel?.name || model || '-'}
										</span>
									</div>
									<div className="flex justify-between items-start border-b pb-2">
										<span className="text-sm text-muted-foreground">Status</span>
										<Badge className={statusDisplay.className}>{statusDisplay.label}</Badge>
									</div>
									<div className="flex justify-between items-start border-b pb-2">
										<span className="text-sm text-muted-foreground">Tools Selected</span>
										<span className="text-sm font-medium">{selectedToolIds.length}</span>
									</div>
									<div className="flex justify-between items-start">
										<span className="text-sm text-muted-foreground">Est. Prompt Tokens</span>
										<span className="text-sm font-medium">~{estimatedTokens.toLocaleString()}</span>
									</div>
								</div>

								{/* Validation Status */}
								<div className="pt-4 border-t">
									<div className="flex items-center justify-between mb-2">
										<h4 className="text-sm font-medium">Validation Status</h4>
										{isValidating && (
											<span className="text-xs text-muted-foreground animate-pulse">
												Validating...
											</span>
										)}
									</div>
									{hasValidationErrors ? (
										<div className="space-y-2">
											<div className="flex items-center gap-2 text-destructive">
												<AlertTriangle className="h-4 w-4" />
												<span className="text-sm">
													{Object.keys(validationErrors).length} validation error(s)
												</span>
											</div>
											{/* Show individual errors */}
											<ul className="pl-6 space-y-1">
												{Object.entries(validationErrors).map(([field, message]) => (
													<li key={field} className="text-xs text-destructive">
														<span className="font-medium">{field}:</span> {message}
													</li>
												))}
											</ul>
										</div>
									) : (
										<div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
											<CheckCircle className="h-4 w-4" />
											<span className="text-sm">
												{serverPreview?.preview?.readyForDeployment
													? 'Ready for deployment'
													: 'Configuration is valid'}
											</span>
										</div>
									)}
									{Object.keys(validationWarnings).length > 0 && (
										<div className="mt-2 space-y-1">
											{Object.entries(validationWarnings).map(([field, message]) => (
												<div
													key={field}
													className="flex items-start gap-2 text-yellow-600 dark:text-yellow-400"
												>
													<AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
													<span className="text-xs">{message}</span>
												</div>
											))}
										</div>
									)}
								</div>

								{/* Description Preview */}
								{description && (
									<div className="pt-4 border-t">
										<h4 className="text-sm font-medium mb-2">Description</h4>
										<p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Selected Tools by Category */}
						<Card>
							<CardHeader>
								<CardTitle>Selected Tools</CardTitle>
								<CardDescription>
									{selectedToolIds.length} tool{selectedToolIds.length !== 1 ? 's' : ''} selected
								</CardDescription>
							</CardHeader>
							<CardContent>
								{selectedToolIds.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-8 text-center">
										<Wrench className="h-8 w-8 text-muted-foreground mb-2" />
										<p className="text-sm text-muted-foreground">No tools selected</p>
										<p className="text-xs text-muted-foreground mt-1">
											Add tools in the Tools tab to extend your agent's capabilities
										</p>
									</div>
								) : (
									<div className="space-y-4">
										{Object.entries(toolsByCategory).map(([category, categoryTools]) => {
											const IconComponent = CATEGORY_ICONS[category] || Wrench
											return (
												<div key={category}>
													<div className="flex items-center gap-2 mb-2">
														<IconComponent className="h-4 w-4 text-muted-foreground" />
														<span className="text-sm font-medium capitalize">{category}</span>
														<Badge variant="secondary" className="text-xs">
															{categoryTools.length}
														</Badge>
													</div>
													<div className="flex flex-wrap gap-2 pl-6">
														{categoryTools.map((tool) => (
															<Badge key={tool.id} variant="outline" className="text-xs">
																{tool.name}
															</Badge>
														))}
													</div>
												</div>
											)
										})}
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* System Prompt Preview */}
					<Card>
						<CardHeader>
							<CardTitle>System Prompt Preview</CardTitle>
							<CardDescription>
								{instructions.length.toLocaleString()} characters | ~
								{estimatedTokens.toLocaleString()} tokens
							</CardDescription>
						</CardHeader>
						<CardContent>
							{instructions ? (
								<div className="rounded-md bg-muted p-4 max-h-64 overflow-y-auto">
									<pre className="text-sm whitespace-pre-wrap font-mono">{instructions}</pre>
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<FileCode className="h-8 w-8 text-muted-foreground mb-2" />
									<p className="text-sm text-muted-foreground">No system prompt defined</p>
									<p className="text-xs text-muted-foreground mt-1">
										Add a system prompt in the Prompt tab to define your agent's behavior
									</p>
								</div>
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
						<Button variant="destructive" onClick={handleDelete} disabled={deleteAgent.isPending}>
							{deleteAgent.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
