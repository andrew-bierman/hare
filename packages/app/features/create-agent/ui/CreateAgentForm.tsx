'use client'

import { useNavigate } from '@tanstack/react-router'
import { Button } from '@hare/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@hare/ui/components/card'
import { Checkbox } from '@hare/ui/components/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@hare/ui/components/collapsible'
import { Input } from '@hare/ui/components/input'
import { Label } from '@hare/ui/components/label'
import { Switch } from '@hare/ui/components/switch'
import { Textarea } from '@hare/ui/components/textarea'
import { type ChangeEvent, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import type { AgentConfig } from '@hare/types'
import { useCreateAgentMutation, useToolsQuery } from '../../../shared/api/hooks'
import { AgentInstructionsEditor } from '../../../widgets/agent-builder'
import { ResponseStyleSelector } from '../../../widgets/response-style-selector'
import { AdvancedSettings } from '../../../widgets/advanced-settings'
import { ModelSelector } from '../../../widgets/model-selector'
import { PromptGenerator } from '../../../widgets/prompt-generator'
import {
	getTemplateById,
	getResponseStyleById,
	getResponseStyleFromConfig,
	type ResponseStyle,
} from '@hare/config'
import { cn } from '@hare/ui/lib/utils'

interface CreateAgentFormProps {
	workspaceId: string | undefined
	templateId?: string
}

export function CreateAgentForm({ workspaceId, templateId }: CreateAgentFormProps) {
	const navigate = useNavigate()
	const createAgent = useCreateAgentMutation(workspaceId)
	const { data: toolsData } = useToolsQuery(workspaceId)

	// Load template if provided
	const template = templateId ? getTemplateById(templateId) : undefined

	// Form state
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [model, setModel] = useState('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
	const [instructions, setInstructions] = useState('')
	const [systemToolsEnabled, setSystemToolsEnabled] = useState(true)
	const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
	const [responseStyle, setResponseStyle] = useState<ResponseStyle>('balanced')
	const [config, setConfig] = useState<AgentConfig>({
		temperature: 0.7,
		maxTokens: 4096,
		topP: 0.95,
	})
	const [toolsOpen, setToolsOpen] = useState(false)

	const tools = toolsData?.tools ?? []
	const customTools = tools.filter((t) => !t.isSystem)

	// Initialize form with template values
	useEffect(() => {
		if (template) {
			setName(`${template.name} Agent`)
			setDescription(template.description)
			setModel(template.model)
			setInstructions(template.instructions)
			setResponseStyle(template.responseStyle)

			// Set config from response style preset
			const preset = getResponseStyleById(template.responseStyle)
			if (preset) {
				setConfig((prev) => ({
					...prev,
					temperature: preset.config.temperature,
					topP: preset.config.topP,
				}))
			}
		}
	}, [template])

	const handleToolToggle = (toolId: string) => {
		setSelectedToolIds((prev) =>
			prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId],
		)
	}

	const handleResponseStyleChange = (style: ResponseStyle) => {
		setResponseStyle(style)
		const preset = getResponseStyleById(style)
		if (preset) {
			setConfig((prev) => ({
				...prev,
				temperature: preset.config.temperature,
				topP: preset.config.topP,
			}))
		}
	}

	const handleConfigChange = (newConfig: AgentConfig) => {
		setConfig(newConfig)
		// Update response style based on temperature if manually changed
		if (newConfig.temperature !== undefined) {
			const detectedStyle = getResponseStyleFromConfig(newConfig.temperature)
			if (detectedStyle !== responseStyle) {
				setResponseStyle(detectedStyle)
			}
		}
	}

	const handleSubmit = async () => {
		if (!name.trim()) {
			toast.error('Please enter an agent name')
			return
		}

		if (!model) {
			toast.error('Please select a model')
			return
		}

		try {
			const agent = await createAgent.mutateAsync({
				name: name.trim(),
				description: description.trim() || undefined,
				model,
				instructions: instructions.trim() || undefined,
				systemToolsEnabled,
				toolIds: selectedToolIds.length > 0 ? selectedToolIds : undefined,
				config: {
					temperature: config.temperature,
					maxTokens: config.maxTokens,
					topP: config.topP,
					topK: config.topK,
				},
			})
			toast.success('Agent created successfully')
			navigate({ to: `/dashboard/agents/${agent.id}` })
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create agent')
		}
	}

	const handleCancel = () => {
		navigate({ to: '/dashboard/agents' })
	}

	return (
		<div className="grid gap-4 md:grid-cols-3">
			<div className="md:col-span-2 space-y-4">
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>Configure your agent's identity and purpose</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Agent Name *</Label>
							<Input
								id="name"
								placeholder="e.g., Customer Support Agent"
								value={name}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								placeholder="Describe what this agent does..."
								className="h-24"
								value={description}
								onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Configuration</CardTitle>
						<CardDescription>Set up your agent's behavior and capabilities</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<ModelSelector
								value={model}
								onValueChange={setModel}
								disabled={createAgent.isPending}
								label="Model *"
							/>
							<ResponseStyleSelector
								value={responseStyle}
								onValueChange={handleResponseStyleChange}
								disabled={createAgent.isPending}
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="system-prompt">System Prompt</Label>
								<PromptGenerator
									onGenerate={setInstructions}
									disabled={createAgent.isPending}
								/>
							</div>
							<AgentInstructionsEditor
								value={instructions}
								onChange={setInstructions}
								disabled={createAgent.isPending}
								placeholder="You are a helpful assistant that..."
								minHeight="200px"
								maxHeight="400px"
							/>
							<p className="text-xs text-muted-foreground">
								Define how your agent should behave. Use Markdown formatting and template
								variables like {'{'}
								{'{'} user_name {'}'}
								{'}'}. This prompt will be sent with every conversation.
							</p>
						</div>

						<AdvancedSettings
							config={config}
							onConfigChange={handleConfigChange}
							disabled={createAgent.isPending}
						/>
					</CardContent>
				</Card>

				{/* Collapsible Tools Section */}
				<Card>
					<Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
						<CollapsibleTrigger className="w-full">
							<CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg">
								<div className="flex items-center justify-between">
									<div className="text-left">
										<CardTitle className="flex items-center gap-2">
											Tools & Capabilities
											{(systemToolsEnabled || selectedToolIds.length > 0) && (
												<span className="text-xs font-normal text-muted-foreground">
													({systemToolsEnabled ? '50+ system' : ''}{systemToolsEnabled && selectedToolIds.length > 0 ? ' + ' : ''}{selectedToolIds.length > 0 ? `${selectedToolIds.length} custom` : ''})
												</span>
											)}
										</CardTitle>
										<CardDescription>Enable tools for your agent</CardDescription>
									</div>
									<ChevronDown
										className={cn(
											'h-5 w-5 text-muted-foreground transition-transform',
											toolsOpen && 'rotate-180'
										)}
									/>
								</div>
							</CardHeader>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<CardContent className="space-y-4">
								{/* System Tools Toggle */}
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

								{/* Custom Tools */}
								{customTools.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										No custom tools available. You can add custom tools after creating the agent.
									</p>
								) : (
									<div className="space-y-3">
										<Label className="text-sm font-medium">Custom Tools</Label>
										{customTools.map((tool) => (
											<div key={tool.id} className="flex items-start space-x-3">
												<Checkbox
													id={tool.id}
													checked={selectedToolIds.includes(tool.id)}
													onCheckedChange={() => handleToolToggle(tool.id)}
												/>
												<div className="space-y-1">
													<label
														htmlFor={tool.id}
														className="text-sm font-medium leading-none cursor-pointer"
													>
														{tool.name}
													</label>
													<p className="text-xs text-muted-foreground">{tool.description}</p>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</CollapsibleContent>
					</Collapsible>
				</Card>
			</div>

			<div className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle>Actions</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button
							className="w-full"
							onClick={handleSubmit}
							disabled={createAgent.isPending || !name.trim()}
						>
							{createAgent.isPending ? 'Creating...' : 'Create Agent'}
						</Button>
						<Button variant="outline" className="w-full" onClick={handleCancel}>
							Cancel
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Tips</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm text-muted-foreground">
						<p>Give your agent a clear, descriptive name that reflects its purpose.</p>
						<p>
							<strong>Response Style</strong> controls how creative vs. consistent responses are.
						</p>
						<p>Write a detailed system prompt to guide the agent's behavior and responses.</p>
						<p>After creation, you'll need to deploy the agent before testing it.</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
