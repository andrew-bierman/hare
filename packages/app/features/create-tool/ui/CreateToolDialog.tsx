'use client'

import { Button } from '@hare/ui/components/button'
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
import { Textarea } from '@hare/ui/components/textarea'
import { type ChangeEvent, useState } from 'react'
import { toast } from 'sonner'
import { useCreateToolMutation } from '../../../shared/api/hooks'

const TOOL_TYPES = [
	{ value: 'http', label: 'HTTP', description: 'Call external APIs' },
	{ value: 'sql', label: 'SQL', description: 'Query databases' },
	{ value: 'kv', label: 'KV Store', description: 'Key-value storage' },
	{ value: 'r2', label: 'R2 Storage', description: 'Object storage' },
	{ value: 'custom', label: 'Custom', description: 'Custom tool logic' },
] as const

type ToolType = (typeof TOOL_TYPES)[number]['value']

interface CreateToolDialogProps {
	workspaceId: string | undefined
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function CreateToolDialog({ workspaceId, open, onOpenChange }: CreateToolDialogProps) {
	const createTool = useCreateToolMutation(workspaceId)

	const [newName, setNewName] = useState('')
	const [newDescription, setNewDescription] = useState('')
	const [newType, setNewType] = useState<ToolType>('http')
	const [newConfig, setNewConfig] = useState('')

	const resetForm = () => {
		setNewName('')
		setNewDescription('')
		setNewType('http')
		setNewConfig('')
	}

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
				description: newDescription.trim() || `Custom ${newType} tool`,
				type: newType,
				inputSchema: {},
				config,
			})

			toast.success('Tool created successfully')
			onOpenChange(false)
			resetForm()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create tool')
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
							onChange={(e: ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="tool-description">Description</Label>
						<Textarea
							id="tool-description"
							placeholder="What does this tool do?"
							value={newDescription}
							onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewDescription(e.target.value)}
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
							onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewConfig(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={createTool.isPending || !newName.trim()}>
						{createTool.isPending ? 'Creating...' : 'Create'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
