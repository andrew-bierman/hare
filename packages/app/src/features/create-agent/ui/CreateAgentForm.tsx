'use client'

import { useNavigate } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@workspace/ui/components/select'
import { Textarea } from '@workspace/ui/components/textarea'
import { type ChangeEvent, useState } from 'react'
import { toast } from 'sonner'
import type { Tool } from '../../../shared/api/types'
import { useCreateAgent, useTools } from '../../../shared/api/hooks'
import { AgentInstructionsEditor } from '../../../widgets/agent-builder'
import { AVAILABLE_MODELS } from '../../../shared/config'

interface CreateAgentFormProps {
	workspaceId: string | undefined
}

export function CreateAgentForm({ workspaceId }: CreateAgentFormProps) {
	const navigate = useNavigate()
	const createAgent = useCreateAgent(workspaceId)
	const { data: toolsData } = useTools(workspaceId)

	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [model, setModel] = useState('llama-3.3-70b')
	const [instructions, setInstructions] = useState('')
	const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])

	const tools = toolsData?.tools ?? []

	const handleToolToggle = (toolId: string) => {
		setSelectedToolIds((prev: string[]) =>
			prev.includes(toolId) ? prev.filter((id: string) => id !== toolId) : [...prev, toolId],
		)
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
				toolIds: selectedToolIds.length > 0 ? selectedToolIds : undefined,
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
						<div className="space-y-2">
							<Label htmlFor="model">Model *</Label>
							<Select value={model} onValueChange={setModel}>
								<SelectTrigger id="model">
									<SelectValue placeholder="Select a model" />
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
						<div className="space-y-2">
							<Label htmlFor="system-prompt">System Prompt</Label>
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
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Tools & Capabilities</CardTitle>
						<CardDescription>Enable additional tools for your agent</CardDescription>
					</CardHeader>
					<CardContent>
						{tools.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No tools available. Tools will be automatically created when you deploy.
							</p>
						) : (
							<div className="space-y-3">
								{tools.map((tool: Tool) => (
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
												{tool.isSystem && (
													<span className="ml-2 text-xs text-muted-foreground">(System)</span>
												)}
											</label>
											<p className="text-xs text-muted-foreground">{tool.description}</p>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
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
						<p>Write a detailed system prompt to guide the agent's behavior and responses.</p>
						<p>
							Start with Llama 3.3 70B for the best quality, or use a smaller model for faster
							responses.
						</p>
						<p>After creation, you'll need to deploy the agent before testing it.</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
