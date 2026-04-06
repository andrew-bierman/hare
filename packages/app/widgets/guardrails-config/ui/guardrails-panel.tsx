'use client'

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
	DialogTrigger,
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
import { Switch } from '@hare/ui/components/switch'
import { Textarea } from '@hare/ui/components/textarea'
import { cn } from '@hare/ui/lib/utils'
import {
	AlertTriangle,
	Ban,
	Eye,
	FileWarning,
	Lock,
	Plus,
	Shield,
	ShieldAlert,
	Trash2,
} from 'lucide-react'
import { useState } from 'react'

export interface Guardrail {
	id: string
	name: string
	description: string | null
	type: string
	action: string
	enabled: boolean
	message: string | null
}

const GUARDRAIL_TYPE_INFO: Record<
	string,
	{ label: string; description: string; icon: typeof Shield }
> = {
	content_filter: {
		label: 'Content Filter',
		description: 'Block harmful, inappropriate, or off-topic content',
		icon: Ban,
	},
	topic_restriction: {
		label: 'Topic Restriction',
		description: 'Limit agent to specific topics only',
		icon: AlertTriangle,
	},
	pii_protection: {
		label: 'PII Protection',
		description: 'Detect and redact personal information',
		icon: Lock,
	},
	prompt_injection: {
		label: 'Prompt Injection',
		description: 'Detect and block prompt injection attempts',
		icon: ShieldAlert,
	},
	output_validation: {
		label: 'Output Validation',
		description: 'Validate agent responses meet format requirements',
		icon: FileWarning,
	},
	word_filter: {
		label: 'Word Filter',
		description: 'Block specific words or patterns',
		icon: Eye,
	},
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
	block: { label: 'Block', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
	warn: {
		label: 'Warn',
		color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
	},
	redact: {
		label: 'Redact',
		color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
	},
	log: {
		label: 'Log Only',
		color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
	},
}

export interface GuardrailsPanelProps {
	guardrails: Guardrail[]
	guardrailsEnabled: boolean
	onToggleEnabled: (enabled: boolean) => void
	onCreateGuardrail: (options: {
		name: string
		type: string
		action: string
		description?: string
		message?: string
	}) => void
	onDeleteGuardrail: (id: string) => void
	onToggleGuardrail: (id: string, enabled: boolean) => void
	className?: string
}

export function GuardrailsPanel({
	guardrails,
	guardrailsEnabled,
	onToggleEnabled,
	onCreateGuardrail,
	onDeleteGuardrail,
	onToggleGuardrail,
	className,
}: GuardrailsPanelProps) {
	const [createOpen, setCreateOpen] = useState(false)
	const [name, setName] = useState('')
	const [type, setType] = useState('content_filter')
	const [action, setAction] = useState('block')
	const [description, setDescription] = useState('')
	const [message, setMessage] = useState('')

	const handleCreate = () => {
		if (!name.trim()) return
		onCreateGuardrail({
			name: name.trim(),
			type,
			action,
			description: description.trim() || undefined,
			message: message.trim() || undefined,
		})
		setName('')
		setType('content_filter')
		setAction('block')
		setDescription('')
		setMessage('')
		setCreateOpen(false)
	}

	return (
		<div className={cn('space-y-4', className)}>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Shield className="h-5 w-5 text-muted-foreground" />
					<h3 className="text-lg font-semibold">Guardrails</h3>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<Label htmlFor="guardrails-toggle" className="text-sm text-muted-foreground">
							{guardrailsEnabled ? 'Enabled' : 'Disabled'}
						</Label>
						<Switch
							id="guardrails-toggle"
							checked={guardrailsEnabled}
							onCheckedChange={onToggleEnabled}
						/>
					</div>
					<Dialog open={createOpen} onOpenChange={setCreateOpen}>
						<DialogTrigger asChild>
							<Button size="sm" className="gap-2" disabled={!guardrailsEnabled}>
								<Plus className="h-4 w-4" />
								Add Rule
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Add Guardrail</DialogTitle>
								<DialogDescription>
									Configure a safety rule for this agent's inputs and outputs.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="gr-name">Name</Label>
									<Input
										id="gr-name"
										placeholder="Block harmful content"
										value={name}
										onChange={(e) => setName(e.target.value)}
									/>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Type</Label>
										<Select value={type} onValueChange={setType}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{Object.entries(GUARDRAIL_TYPE_INFO).map(([key, info]) => (
													<SelectItem key={key} value={key}>
														{info.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>Action</Label>
										<Select value={action} onValueChange={setAction}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{Object.entries(ACTION_LABELS).map(([key, info]) => (
													<SelectItem key={key} value={key}>
														{info.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="gr-desc">Description</Label>
									<Input
										id="gr-desc"
										placeholder="What does this rule do?"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="gr-message">Custom Message</Label>
									<Textarea
										id="gr-message"
										placeholder="Message shown when rule triggers (optional)"
										value={message}
										onChange={(e) => setMessage(e.target.value)}
										rows={2}
									/>
								</div>
							</div>
							<DialogFooter>
								<Button variant="outline" onClick={() => setCreateOpen(false)}>
									Cancel
								</Button>
								<Button onClick={handleCreate} disabled={!name.trim()}>
									Add Guardrail
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{!guardrailsEnabled ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<Shield className="h-10 w-10 text-muted-foreground/50 mb-3" />
						<p className="text-sm text-muted-foreground">
							Enable guardrails to add safety rules for this agent
						</p>
					</CardContent>
				</Card>
			) : guardrails.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<Shield className="h-10 w-10 text-muted-foreground/50 mb-3" />
						<p className="text-sm text-muted-foreground mb-3">No guardrails configured</p>
						<Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Add your first guardrail
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-2">
					{guardrails.map((g) => {
						const typeInfo = GUARDRAIL_TYPE_INFO[g.type]
						const actionInfo = ACTION_LABELS[g.action]
						const Icon = typeInfo?.icon ?? Shield

						return (
							<Card key={g.id} className={cn(!g.enabled && 'opacity-50')}>
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Icon className="h-4 w-4 text-muted-foreground" />
											<CardTitle className="text-sm font-medium">{g.name}</CardTitle>
											<Badge className={cn('text-xs', actionInfo?.color)}>
												{actionInfo?.label ?? g.action}
											</Badge>
										</div>
										<div className="flex items-center gap-2">
											<Switch
												checked={g.enabled}
												onCheckedChange={(checked) => onToggleGuardrail(g.id, checked)}
											/>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-muted-foreground hover:text-destructive"
												aria-label={`Delete guardrail ${g.name}`}
												onClick={() => onDeleteGuardrail(g.id)}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
									{g.description && (
										<CardDescription className="text-xs">{g.description}</CardDescription>
									)}
								</CardHeader>
							</Card>
						)
					})}
				</div>
			)}
		</div>
	)
}
