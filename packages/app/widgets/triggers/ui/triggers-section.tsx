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
import { cn } from '@hare/ui/lib/utils'
import {
	CheckCircle,
	Clock,
	Copy,
	Loader2,
	Mail,
	Play,
	Plus,
	RefreshCw,
	Trash2,
	Webhook,
	XCircle,
	Zap,
} from 'lucide-react'
import { useState } from 'react'

export interface TriggerData {
	id: string
	agentId: string
	type: string
	name: string
	description: string | null
	enabled: boolean
	status: string
	webhookPath: string | null
	webhookUrl: string | null
	lastTriggeredAt: string | null
	triggerCount: number
}

export interface TriggerExecution {
	id: string
	status: string
	startedAt: string
	completedAt: string | null
	durationMs: number | null
	error: string | null
}

const TYPE_INFO: Record<string, { label: string; icon: typeof Webhook; color: string }> = {
	webhook: {
		label: 'Webhook',
		icon: Webhook,
		color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
	},
	email: {
		label: 'Email',
		icon: Mail,
		color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
	},
	cron: {
		label: 'Cron',
		icon: Clock,
		color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
	},
	manual: {
		label: 'Manual',
		icon: Play,
		color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
	},
}

const STATUS_ICON: Record<string, typeof CheckCircle> = {
	completed: CheckCircle,
	failed: XCircle,
	running: Loader2,
	pending: Clock,
}

export interface TriggersSectionProps {
	triggers: TriggerData[]
	executions?: TriggerExecution[]
	isLoading?: boolean
	onCreateTrigger: (options: {
		agentId: string
		type: string
		name: string
		description?: string
		config?: Record<string, unknown>
	}) => void
	onDeleteTrigger: (id: string) => void
	onToggleTrigger: (id: string, enabled: boolean) => void
	onCopyWebhookUrl?: (url: string) => void
	onRegenerateWebhook?: (id: string) => void
	agentId: string
	className?: string
}

export function TriggersSection({
	triggers,
	executions,
	isLoading,
	onCreateTrigger,
	onDeleteTrigger,
	onToggleTrigger,
	onCopyWebhookUrl,
	onRegenerateWebhook,
	agentId,
	className,
}: TriggersSectionProps) {
	const [createOpen, setCreateOpen] = useState(false)
	const [name, setName] = useState('')
	const [type, setType] = useState('webhook')
	const [description, setDescription] = useState('')
	const [cronExpression, setCronExpression] = useState('')

	const handleCreate = () => {
		if (!name.trim()) return
		const config: Record<string, unknown> = {}
		if (type === 'cron' && cronExpression) {
			config.expression = cronExpression
		}
		onCreateTrigger({
			agentId,
			type,
			name: name.trim(),
			description: description.trim() || undefined,
			config: Object.keys(config).length > 0 ? config : undefined,
		})
		setName('')
		setType('webhook')
		setDescription('')
		setCronExpression('')
		setCreateOpen(false)
	}

	return (
		<div className={cn('space-y-4', className)}>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Zap className="h-5 w-5 text-muted-foreground" />
					<h3 className="text-lg font-semibold">Triggers</h3>
				</div>
				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogTrigger asChild>
						<Button size="sm" className="gap-2">
							<Plus className="h-4 w-4" />
							Add Trigger
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Trigger</DialogTitle>
							<DialogDescription>
								Configure how this agent gets activated by external events.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="trigger-name">Name</Label>
								<Input
									id="trigger-name"
									placeholder="Order webhook"
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>Type</Label>
								<Select value={type} onValueChange={setType}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(TYPE_INFO).map(([key, info]) => (
											<SelectItem key={key} value={key}>
												{info.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{type === 'cron' && (
								<div className="space-y-2">
									<Label htmlFor="cron-expr">Cron Expression</Label>
									<Input
										id="cron-expr"
										placeholder="0 */6 * * *"
										value={cronExpression}
										onChange={(e) => setCronExpression(e.target.value)}
									/>
									<p className="text-xs text-muted-foreground">
										e.g. "0 */6 * * *" = every 6 hours
									</p>
								</div>
							)}
							<div className="space-y-2">
								<Label htmlFor="trigger-desc">Description</Label>
								<Input
									id="trigger-desc"
									placeholder="Triggered when a new order is placed"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setCreateOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleCreate} disabled={!name.trim()}>
								Create Trigger
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{isLoading ? (
				<Card>
					<CardContent className="flex items-center justify-center py-12">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</CardContent>
				</Card>
			) : triggers.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<h4 className="text-sm font-medium text-muted-foreground mb-1">
							No triggers configured
						</h4>
						<p className="text-xs text-muted-foreground mb-4">
							Add triggers to activate this agent from webhooks, emails, or schedules.
						</p>
						<Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Create your first trigger
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-2">
					{triggers.map((trigger) => {
						const typeInfo = TYPE_INFO[trigger.type]
						const Icon = typeInfo?.icon ?? Zap

						return (
							<Card key={trigger.id} className={cn(!trigger.enabled && 'opacity-50')}>
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Icon className="h-4 w-4 text-muted-foreground" />
											<CardTitle className="text-sm font-medium">{trigger.name}</CardTitle>
											<Badge className={cn('text-xs', typeInfo?.color)}>
												{typeInfo?.label ?? trigger.type}
											</Badge>
											{trigger.triggerCount > 0 && (
												<span className="text-xs text-muted-foreground">
													{trigger.triggerCount} runs
												</span>
											)}
										</div>
										<div className="flex items-center gap-2">
											{trigger.type === 'webhook' && trigger.webhookUrl && (
												<>
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7"
														aria-label="Copy webhook URL"
														onClick={() => onCopyWebhookUrl?.(trigger.webhookUrl!)}
													>
														<Copy className="h-3.5 w-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7"
														aria-label="Regenerate webhook URL"
														onClick={() => onRegenerateWebhook?.(trigger.id)}
													>
														<RefreshCw className="h-3.5 w-3.5" />
													</Button>
												</>
											)}
											<Switch
												checked={trigger.enabled}
												onCheckedChange={(checked) => onToggleTrigger(trigger.id, checked)}
											/>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-muted-foreground hover:text-destructive"
												aria-label={`Delete trigger ${trigger.name}`}
												onClick={() => onDeleteTrigger(trigger.id)}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
									{trigger.description && (
										<CardDescription className="text-xs">{trigger.description}</CardDescription>
									)}
									{trigger.type === 'webhook' && trigger.webhookUrl && (
										<code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded mt-1 block truncate">
											{trigger.webhookUrl}
										</code>
									)}
								</CardHeader>
							</Card>
						)
					})}
				</div>
			)}

			{executions && executions.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Recent Executions</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{executions.slice(0, 10).map((exec) => {
								const StatusIcon = STATUS_ICON[exec.status] ?? Clock
								return (
									<div
										key={exec.id}
										className="flex items-center justify-between text-xs py-1 border-b last:border-0"
									>
										<div className="flex items-center gap-2">
											<StatusIcon
												className={cn(
													'h-3.5 w-3.5',
													exec.status === 'completed' && 'text-green-600',
													exec.status === 'failed' && 'text-red-600',
													exec.status === 'running' && 'animate-spin text-blue-600',
												)}
											/>
											<span className="text-muted-foreground">
												{new Date(exec.startedAt).toLocaleString()}
											</span>
										</div>
										<div className="flex items-center gap-2">
											{exec.durationMs !== null && (
												<span className="text-muted-foreground">{exec.durationMs}ms</span>
											)}
											{exec.error && (
												<span className="text-red-600 truncate max-w-32">{exec.error}</span>
											)}
										</div>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
