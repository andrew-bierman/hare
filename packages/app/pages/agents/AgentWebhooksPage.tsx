'use client'

import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hare/ui/components/card'
import { Checkbox } from '@hare/ui/components/checkbox'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@hare/ui/components/collapsible'
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
import { ScrollArea } from '@hare/ui/components/scroll-area'
import { Skeleton } from '@hare/ui/components/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@hare/ui/components/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hare/ui/components/tabs'
import { Textarea } from '@hare/ui/components/textarea'
import { Link } from '@tanstack/react-router'
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	Copy,
	Eye,
	EyeOff,
	Loader2,
	Plus,
	RefreshCw,
	Trash2,
	Webhook as WebhookIcon,
	XCircle,
} from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import { toast } from 'sonner'
import { useAgentQuery } from '../../shared/api'
import {
	useCreateWebhookMutation,
	useDeleteWebhookMutation,
	useRegenerateWebhookSecretMutation,
	useRetryWebhookDeliveryMutation,
	useUpdateWebhookMutation,
	useWebhookDeliveriesQuery,
	useWebhookLogsQuery,
	useWebhooksQuery,
	type Webhook,
	type WebhookDelivery,
} from '../../shared/api/hooks'

export interface AgentWebhooksPageProps {
	agentId: string
}

// =============================================================================
// Constants
// =============================================================================

type WebhookEventType =
	| 'message.received'
	| 'message.sent'
	| 'tool.called'
	| 'error'
	| 'agent.deployed'

const WEBHOOK_EVENTS: { value: WebhookEventType; label: string; description: string }[] = [
	{
		value: 'message.received',
		label: 'Message Received',
		description: 'When user sends a message',
	},
	{ value: 'message.sent', label: 'Message Sent', description: 'When agent sends a response' },
	{ value: 'tool.called', label: 'Tool Called', description: 'When agent uses a tool' },
	{ value: 'error', label: 'Error', description: 'When an error occurs' },
	{ value: 'agent.deployed', label: 'Agent Deployed', description: 'When agent is deployed' },
]

// =============================================================================
// Components
// =============================================================================

function LoadingSkeleton() {
	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center gap-4">
				<Skeleton className="h-9 w-9" />
				<div className="space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
			</div>
			<div className="space-y-4">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		</div>
	)
}

function StatusBadge({ status }: { status: string }) {
	const variants = {
		active: {
			className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
			icon: CheckCircle2,
		},
		inactive: {
			className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
			icon: Clock,
		},
		failed: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
			icon: XCircle,
		},
	} as const satisfies Record<string, { className: string; icon: typeof CheckCircle2 }>
	const variant = variants[status as keyof typeof variants] ?? variants.inactive
	return (
		<Badge className={variant.className}>
			<variant.icon className="h-3 w-3 mr-1" />
			{status}
		</Badge>
	)
}

function DeliveryStatusBadge({ status }: { status: string }) {
	const variants = {
		success: {
			className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
			icon: CheckCircle2,
		},
		pending: {
			className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
			icon: Clock,
		},
		failed: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
			icon: XCircle,
		},
	} as const satisfies Record<string, { className: string; icon: typeof CheckCircle2 }>
	const variant = variants[status as keyof typeof variants] ?? variants.pending
	return (
		<Badge className={variant.className}>
			<variant.icon className="h-3 w-3 mr-1" />
			{status}
		</Badge>
	)
}

interface WebhookFormProps {
	initialData?: Webhook
	onSubmit: (data: {
		url: string
		events: WebhookEventType[]
		description?: string
	}) => Promise<void>
	onCancel: () => void
	isSubmitting: boolean
}

function WebhookForm({ initialData, onSubmit, onCancel, isSubmitting }: WebhookFormProps) {
	const [url, setUrl] = useState(initialData?.url ?? '')
	const [events, setEvents] = useState<WebhookEventType[]>(
		(initialData?.events as WebhookEventType[]) ?? [],
	)
	const [description, setDescription] = useState(initialData?.description ?? '')
	const [errors, setErrors] = useState<{ url?: string; events?: string }>({})

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		const newErrors: typeof errors = {}

		if (!url.trim()) {
			newErrors.url = 'URL is required'
		} else {
			try {
				new URL(url)
			} catch {
				newErrors.url = 'Invalid URL format'
			}
		}

		if (events.length === 0) {
			newErrors.events = 'Select at least one event'
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors)
			return
		}

		await onSubmit({ url, events, description: description || undefined })
	}

	const toggleEvent = (event: WebhookEventType) => {
		setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]))
		setErrors((prev) => ({ ...prev, events: undefined }))
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="webhook-url">Endpoint URL</Label>
				<Input
					id="webhook-url"
					type="url"
					value={url}
					onChange={(e: ChangeEvent<HTMLInputElement>) => {
						setUrl(e.target.value)
						setErrors((prev) => ({ ...prev, url: undefined }))
					}}
					placeholder="https://your-server.com/webhook"
					className={errors.url ? 'border-destructive' : ''}
				/>
				{errors.url && <p className="text-sm text-destructive">{errors.url}</p>}
			</div>

			<div className="space-y-2">
				<Label>Events</Label>
				<div className="space-y-2">
					{WEBHOOK_EVENTS.map((event) => (
						<label
							key={event.value}
							htmlFor={`event-${event.value}`}
							className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
						>
							<Checkbox
								id={`event-${event.value}`}
								checked={events.includes(event.value)}
								onCheckedChange={() => toggleEvent(event.value)}
							/>
							<div className="space-y-0.5">
								<div className="text-sm font-medium">{event.label}</div>
								<div className="text-xs text-muted-foreground">{event.description}</div>
							</div>
						</label>
					))}
				</div>
				{errors.events && <p className="text-sm text-destructive">{errors.events}</p>}
			</div>

			<div className="space-y-2">
				<Label htmlFor="webhook-description">Description (optional)</Label>
				<Textarea
					id="webhook-description"
					value={description}
					onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
					placeholder="A brief description of this webhook"
					className="h-20"
				/>
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Saving...
						</>
					) : initialData ? (
						'Update Webhook'
					) : (
						'Create Webhook'
					)}
				</Button>
			</DialogFooter>
		</form>
	)
}

function formatRelativeTime(date: Date): string {
	const now = new Date()
	const diffMs = date.getTime() - now.getTime()
	const diffMins = Math.round(diffMs / 60000)

	if (diffMins <= 0) return 'now'
	if (diffMins < 60) return `in ${diffMins}m`
	const diffHours = Math.round(diffMins / 60)
	if (diffHours < 24) return `in ${diffHours}h`
	return date.toLocaleString()
}

interface DeliveryRowProps {
	delivery: WebhookDelivery
	onRetry: (deliveryId: string) => void
	isRetrying: boolean
}

function DeliveryRow({ delivery, onRetry, isRetrying }: DeliveryRowProps) {
	const [isOpen, setIsOpen] = useState(false)
	const canRetry = delivery.status === 'failed'

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<TableRow className="cursor-pointer hover:bg-muted/50">
				<TableCell className="w-8">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="h-6 w-6 p-0">
							{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
				</TableCell>
				<TableCell>
					<Badge variant="outline">{delivery.event}</Badge>
				</TableCell>
				<TableCell>
					<DeliveryStatusBadge status={delivery.status} />
				</TableCell>
				<TableCell>
					{delivery.statusCode ? (
						<span
							className={
								delivery.statusCode >= 200 && delivery.statusCode < 300
									? 'text-emerald-600'
									: 'text-red-600'
							}
						>
							HTTP {delivery.statusCode}
						</span>
					) : (
						<span className="text-muted-foreground">-</span>
					)}
				</TableCell>
				<TableCell className="text-muted-foreground text-sm">
					{new Date(delivery.createdAt).toLocaleString()}
				</TableCell>
				<TableCell>
					<div className="flex items-center gap-2">
						{delivery.attemptCount > 0 && (
							<span className="text-xs text-muted-foreground">
								{delivery.attemptCount} attempt{delivery.attemptCount !== 1 ? 's' : ''}
							</span>
						)}
						{delivery.status === 'pending' && delivery.nextRetryAt && (
							<span className="text-xs text-yellow-600">
								Retry {formatRelativeTime(new Date(delivery.nextRetryAt))}
							</span>
						)}
						{canRetry && (
							<Button
								variant="outline"
								size="sm"
								className="h-7"
								onClick={(e) => {
									e.stopPropagation()
									onRetry(delivery.id)
								}}
								disabled={isRetrying}
							>
								{isRetrying ? (
									<Loader2 className="h-3 w-3 animate-spin" />
								) : (
									<RefreshCw className="h-3 w-3" />
								)}
								<span className="ml-1">Retry</span>
							</Button>
						)}
					</div>
				</TableCell>
			</TableRow>
			<CollapsibleContent asChild>
				<tr>
					<td colSpan={6} className="p-0">
						<div className="border-t bg-muted/30 p-4 space-y-4">
							<div>
								<Label className="text-xs text-muted-foreground mb-2 block">Request Payload</Label>
								<pre className="bg-background rounded-md p-3 text-xs overflow-auto max-h-48 border">
									{JSON.stringify(delivery.payload, null, 2)}
								</pre>
							</div>
							{delivery.responseBody && (
								<div>
									<Label className="text-xs text-muted-foreground mb-2 block">Response Body</Label>
									<pre className="bg-background rounded-md p-3 text-xs overflow-auto max-h-48 border">
										{delivery.responseBody}
									</pre>
								</div>
							)}
							{delivery.status === 'pending' && delivery.nextRetryAt && (
								<div className="flex items-center gap-2 text-sm text-yellow-600">
									<Clock className="h-4 w-4" />
									<span>
										Next retry scheduled: {new Date(delivery.nextRetryAt).toLocaleString()}
									</span>
								</div>
							)}
						</div>
					</td>
				</tr>
			</CollapsibleContent>
		</Collapsible>
	)
}

interface WebhookLogsDialogProps {
	webhook: Webhook
	agentId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

function WebhookLogsDialog({ webhook, agentId, open, onOpenChange }: WebhookLogsDialogProps) {
	const [activeTab, setActiveTab] = useState('deliveries')
	const [retryingId, setRetryingId] = useState<string | null>(null)

	const { data: deliveriesData, isLoading: deliveriesLoading } = useWebhookDeliveriesQuery({
		webhookId: webhook.id,
		enabled: open,
	})

	const { data: logsData, isLoading: logsLoading } = useWebhookLogsQuery({
		agentId,
		webhookId: webhook.id,
		enabled: open && activeTab === 'logs',
	})

	const retryMutation = useRetryWebhookDeliveryMutation()

	const handleRetry = async (deliveryId: string) => {
		setRetryingId(deliveryId)
		try {
			await retryMutation.mutateAsync({
				webhookId: webhook.id,
				deliveryId,
			})
			toast.success('Delivery retry initiated')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to retry delivery')
		} finally {
			setRetryingId(null)
		}
	}

	const deliveries = deliveriesData?.deliveries ?? []
	const logs = logsData?.logs ?? []

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-5xl max-h-[85vh]">
				<DialogHeader>
					<DialogTitle>Webhook Deliveries</DialogTitle>
					<DialogDescription>
						View delivery history and retry failed deliveries for this webhook
					</DialogDescription>
				</DialogHeader>
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList>
						<TabsTrigger value="deliveries">Deliveries ({deliveriesData?.total ?? 0})</TabsTrigger>
						<TabsTrigger value="logs">Legacy Logs ({logsData?.total ?? 0})</TabsTrigger>
					</TabsList>
					<TabsContent value="deliveries">
						<ScrollArea className="h-[500px]">
							{deliveriesLoading ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="h-6 w-6 animate-spin" />
								</div>
							) : deliveries.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<Clock className="h-8 w-8 text-muted-foreground mb-2" />
									<p className="text-sm text-muted-foreground">No deliveries yet</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-8" />
											<TableHead>Event</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Response Code</TableHead>
											<TableHead>Timestamp</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{deliveries.map((delivery) => (
											<DeliveryRow
												key={delivery.id}
												delivery={delivery}
												onRetry={handleRetry}
												isRetrying={retryingId === delivery.id}
											/>
										))}
									</TableBody>
								</Table>
							)}
						</ScrollArea>
					</TabsContent>
					<TabsContent value="logs">
						<ScrollArea className="h-[500px]">
							{logsLoading ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="h-6 w-6 animate-spin" />
								</div>
							) : logs.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<Clock className="h-8 w-8 text-muted-foreground mb-2" />
									<p className="text-sm text-muted-foreground">No legacy logs</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Event</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Response</TableHead>
											<TableHead>Attempts</TableHead>
											<TableHead>Time</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{logs.map((log) => (
											<TableRow key={log.id}>
												<TableCell>
													<Badge variant="outline">{log.event}</Badge>
												</TableCell>
												<TableCell>
													<DeliveryStatusBadge status={log.status} />
												</TableCell>
												<TableCell>
													{log.responseStatus ? (
														<span
															className={
																log.responseStatus >= 200 && log.responseStatus < 300
																	? 'text-emerald-600'
																	: 'text-red-600'
															}
														>
															HTTP {log.responseStatus}
														</span>
													) : log.error ? (
														<span className="text-red-600 text-sm">{log.error}</span>
													) : (
														'-'
													)}
												</TableCell>
												<TableCell>{log.attempts}</TableCell>
												<TableCell className="text-muted-foreground text-sm">
													{new Date(log.createdAt).toLocaleString()}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</ScrollArea>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}

// =============================================================================
// Main Page Component
// =============================================================================

export function AgentWebhooksPage({ agentId }: AgentWebhooksPageProps) {
	const { data: agent, isLoading: agentLoading, error: agentError } = useAgentQuery(agentId)
	const { data: webhooksData, isLoading: webhooksLoading } = useWebhooksQuery(agentId)

	const createMutation = useCreateWebhookMutation()
	const updateMutation = useUpdateWebhookMutation()
	const deleteMutation = useDeleteWebhookMutation()
	const regenerateSecretMutation = useRegenerateWebhookSecretMutation()

	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [isEditOpen, setIsEditOpen] = useState(false)
	const [isDeleteOpen, setIsDeleteOpen] = useState(false)
	const [isLogsOpen, setIsLogsOpen] = useState(false)
	const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
	const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

	const webhooks = webhooksData?.webhooks ?? []

	const handleCreate = async (data: {
		url: string
		events: WebhookEventType[]
		description?: string
	}) => {
		try {
			await createMutation.mutateAsync({
				agentId,
				url: data.url,
				events: data.events,
				description: data.description,
			})
			toast.success('Webhook created successfully')
			setIsCreateOpen(false)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create webhook')
		}
	}

	const handleUpdate = async (data: {
		url: string
		events: WebhookEventType[]
		description?: string
	}) => {
		if (!selectedWebhook) return
		try {
			await updateMutation.mutateAsync({
				agentId,
				webhookId: selectedWebhook.id,
				url: data.url,
				events: data.events,
				description: data.description,
			})
			toast.success('Webhook updated successfully')
			setIsEditOpen(false)
			setSelectedWebhook(null)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update webhook')
		}
	}

	const handleDelete = async () => {
		if (!selectedWebhook) return
		try {
			await deleteMutation.mutateAsync({
				agentId,
				webhookId: selectedWebhook.id,
			})
			toast.success('Webhook deleted successfully')
			setIsDeleteOpen(false)
			setSelectedWebhook(null)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete webhook')
		}
	}

	const handleRegenerateSecret = async (webhook: Webhook) => {
		try {
			await regenerateSecretMutation.mutateAsync({
				agentId,
				webhookId: webhook.id,
			})
			toast.success('Secret regenerated successfully')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to regenerate secret')
		}
	}

	const handleToggleStatus = async (webhook: Webhook) => {
		const newStatus = webhook.status === 'active' ? 'inactive' : 'active'
		try {
			await updateMutation.mutateAsync({
				agentId,
				webhookId: webhook.id,
				status: newStatus,
			})
			toast.success(`Webhook ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update webhook')
		}
	}

	const copyToClipboard = async (text: string) => {
		await navigator.clipboard.writeText(text)
		toast.success('Copied to clipboard')
	}

	if (agentLoading || webhooksLoading) {
		return <LoadingSkeleton />
	}

	if (agentError || !agent) {
		return (
			<div className="flex-1 p-8 pt-6">
				<Card className="p-6 text-center">
					<p className="text-destructive">{agentError?.message || 'Agent not found'}</p>
					<Link to="/dashboard/agents">
						<Button className="mt-4">Back to Agents</Button>
					</Link>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Link to="/dashboard/agents/$id" params={{ id: agentId }}>
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<h2 className="text-2xl font-bold tracking-tight">Webhooks</h2>
						<p className="text-muted-foreground">
							Configure webhooks to receive notifications when events occur
						</p>
					</div>
				</div>
				<Button onClick={() => setIsCreateOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Add Webhook
				</Button>
			</div>

			{/* Info Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<WebhookIcon className="h-5 w-5" />
						About Webhooks
					</CardTitle>
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground space-y-2">
					<p>
						Webhooks allow your agent to send real-time notifications to external services when
						specific events occur. Each webhook request includes an HMAC signature for verification.
					</p>
					<p>
						<strong>Signature Header:</strong> <code>X-Webhook-Signature</code> contains the
						HMAC-SHA256 signature of the payload using your secret key.
					</p>
				</CardContent>
			</Card>

			{/* Webhooks List */}
			{webhooks.length === 0 ? (
				<Card className="p-8">
					<div className="flex flex-col items-center justify-center text-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 mb-4">
							<WebhookIcon className="h-8 w-8 text-primary" />
						</div>
						<h3 className="text-lg font-semibold mb-2">No webhooks configured</h3>
						<p className="text-muted-foreground text-sm max-w-md mb-6">
							Add a webhook to receive notifications when your agent processes messages, uses tools,
							or encounters errors.
						</p>
						<Button onClick={() => setIsCreateOpen(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Create Your First Webhook
						</Button>
					</div>
				</Card>
			) : (
				<div className="space-y-4">
					{webhooks.map((webhook) => (
						<Card key={webhook.id}>
							<CardHeader>
								<div className="flex items-start justify-between">
									<div className="space-y-1">
										<CardTitle className="flex items-center gap-2 text-base">
											<code className="text-sm font-normal">{webhook.url}</code>
											<StatusBadge status={webhook.status} />
										</CardTitle>
										{webhook.description && (
											<CardDescription>{webhook.description}</CardDescription>
										)}
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setSelectedWebhook(webhook)
												setIsLogsOpen(true)
											}}
										>
											View Logs
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setSelectedWebhook(webhook)
												setIsEditOpen(true)
											}}
										>
											Edit
										</Button>
										<Button variant="outline" size="sm" onClick={() => handleToggleStatus(webhook)}>
											{webhook.status === 'active' ? 'Disable' : 'Enable'}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setSelectedWebhook(webhook)
												setIsDeleteOpen(true)
											}}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Events */}
								<div>
									<Label className="text-xs text-muted-foreground">Subscribed Events</Label>
									<div className="flex flex-wrap gap-2 mt-1">
										{webhook.events.map((event) => (
											<Badge key={event} variant="secondary">
												{event}
											</Badge>
										))}
									</div>
								</div>

								{/* Secret */}
								<div>
									<Label className="text-xs text-muted-foreground">Signing Secret</Label>
									<div className="flex items-center gap-2 mt-1">
										<code className="text-sm bg-muted px-2 py-1 rounded flex-1 font-mono">
											{showSecrets[webhook.id] ? webhook.secret : '************************'}
										</code>
										<Button
											variant="ghost"
											size="icon"
											onClick={() =>
												setShowSecrets((prev) => ({
													...prev,
													[webhook.id]: !prev[webhook.id],
												}))
											}
										>
											{showSecrets[webhook.id] ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => copyToClipboard(webhook.secret)}
										>
											<Copy className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleRegenerateSecret(webhook)}
										>
											<RefreshCw className="h-4 w-4" />
										</Button>
									</div>
								</div>

								{/* Failed Status Warning */}
								{webhook.status === 'failed' && (
									<div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">
										<AlertCircle className="h-4 w-4" />
										<span className="text-sm">
											This webhook has been disabled due to repeated delivery failures. Re-enable it
											to retry.
										</span>
									</div>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Create Dialog */}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Webhook</DialogTitle>
						<DialogDescription>
							Configure a new webhook to receive event notifications
						</DialogDescription>
					</DialogHeader>
					<WebhookForm
						onSubmit={handleCreate}
						onCancel={() => setIsCreateOpen(false)}
						isSubmitting={createMutation.isPending}
					/>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Webhook</DialogTitle>
						<DialogDescription>Update webhook configuration</DialogDescription>
					</DialogHeader>
					{selectedWebhook && (
						<WebhookForm
							initialData={selectedWebhook}
							onSubmit={handleUpdate}
							onCancel={() => {
								setIsEditOpen(false)
								setSelectedWebhook(null)
							}}
							isSubmitting={updateMutation.isPending}
						/>
					)}
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Webhook</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this webhook? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setIsDeleteOpen(false)
								setSelectedWebhook(null)
							}}
							disabled={deleteMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deleting...
								</>
							) : (
								'Delete'
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Logs Dialog */}
			{selectedWebhook && (
				<WebhookLogsDialog
					webhook={selectedWebhook}
					agentId={agentId}
					open={isLogsOpen}
					onOpenChange={(open) => {
						setIsLogsOpen(open)
						if (!open) setSelectedWebhook(null)
					}}
				/>
			)}
		</div>
	)
}
