import { useAgentQuery } from '@hare/app/shared/api'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hare/ui/components/card'
import { Checkbox } from '@hare/ui/components/checkbox'
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
import { Textarea } from '@hare/ui/components/textarea'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
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
import { type ChangeEvent, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from '@hare/app'

export const Route = createFileRoute('/_dashboard/dashboard/agents/$id/webhooks')({
	component: WebhooksPage,
})

// =============================================================================
// Types
// =============================================================================

interface Webhook {
	id: string
	agentId: string
	url: string
	secret: string
	events: WebhookEventType[]
	status: 'active' | 'inactive' | 'failed'
	description: string | null
	createdAt: string
	updatedAt: string
}

interface WebhookLog {
	id: string
	webhookId: string
	event: string
	payload: Record<string, unknown>
	status: 'success' | 'failed' | 'pending'
	responseStatus: number | null
	responseBody: string | null
	attempts: number
	error: string | null
	createdAt: string
	completedAt: string | null
}

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
// API Functions
// =============================================================================

async function fetchWebhooks(options: {
	agentId: string
	workspaceId: string
}): Promise<Webhook[]> {
	const { agentId, workspaceId } = options
	const response = await fetch(`/api/agents/${agentId}/webhooks?workspaceId=${workspaceId}`)
	if (!response.ok) {
		throw new Error('Failed to fetch webhooks')
	}
	const data = (await response.json()) as { webhooks: Webhook[] }
	return data.webhooks
}

async function createWebhook(options: {
	agentId: string
	workspaceId: string
	url: string
	events: WebhookEventType[]
	description?: string
}): Promise<Webhook> {
	const { agentId, workspaceId, url, events, description } = options
	const response = await fetch(`/api/agents/${agentId}/webhooks?workspaceId=${workspaceId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ url, events, description }),
	})
	if (!response.ok) {
		const error = (await response.json()) as { error?: string }
		throw new Error(error.error || 'Failed to create webhook')
	}
	return (await response.json()) as Webhook
}

async function updateWebhook(options: {
	agentId: string
	webhookId: string
	workspaceId: string
	data: Partial<{
		url: string
		events: WebhookEventType[]
		status: 'active' | 'inactive' | 'failed'
		description: string
	}>
}): Promise<Webhook> {
	const { agentId, webhookId, workspaceId, data } = options
	const response = await fetch(
		`/api/agents/${agentId}/webhooks/${webhookId}?workspaceId=${workspaceId}`,
		{
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		},
	)
	if (!response.ok) {
		const error = (await response.json()) as { error?: string }
		throw new Error(error.error || 'Failed to update webhook')
	}
	return (await response.json()) as Webhook
}

async function deleteWebhook(options: {
	agentId: string
	webhookId: string
	workspaceId: string
}): Promise<void> {
	const { agentId, webhookId, workspaceId } = options
	const response = await fetch(
		`/api/agents/${agentId}/webhooks/${webhookId}?workspaceId=${workspaceId}`,
		{ method: 'DELETE' },
	)
	if (!response.ok) {
		const error = (await response.json()) as { error?: string }
		throw new Error(error.error || 'Failed to delete webhook')
	}
}

async function fetchWebhookLogs(options: {
	agentId: string
	webhookId: string
	workspaceId: string
	limit?: number
}): Promise<{ logs: WebhookLog[]; total: number }> {
	const { agentId, webhookId, workspaceId, limit = 50 } = options
	const response = await fetch(
		`/api/agents/${agentId}/webhooks/${webhookId}/logs?workspaceId=${workspaceId}&limit=${limit}`,
	)
	if (!response.ok) {
		throw new Error('Failed to fetch webhook logs')
	}
	return (await response.json()) as { logs: WebhookLog[]; total: number }
}

async function regenerateSecret(options: {
	agentId: string
	webhookId: string
	workspaceId: string
}): Promise<string> {
	const { agentId, webhookId, workspaceId } = options
	const response = await fetch(
		`/api/agents/${agentId}/webhooks/${webhookId}/regenerate-secret?workspaceId=${workspaceId}`,
		{ method: 'POST' },
	)
	if (!response.ok) {
		const error = (await response.json()) as { error?: string }
		throw new Error(error.error || 'Failed to regenerate secret')
	}
	const data = (await response.json()) as { secret: string }
	return data.secret
}

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

function StatusBadge({ status }: { status: 'active' | 'inactive' | 'failed' }) {
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
	}
	const { className, icon: Icon } = variants[status]
	return (
		<Badge className={className}>
			<Icon className="h-3 w-3 mr-1" />
			{status}
		</Badge>
	)
}

function DeliveryStatusBadge({ status }: { status: 'success' | 'failed' | 'pending' }) {
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
	}
	const { className, icon: Icon } = variants[status]
	return (
		<Badge className={className}>
			<Icon className="h-3 w-3 mr-1" />
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
	const [events, setEvents] = useState<WebhookEventType[]>(initialData?.events ?? [])
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

interface WebhookLogsDialogProps {
	webhook: Webhook
	workspaceId: string
	agentId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

function WebhookLogsDialog({
	webhook,
	workspaceId,
	agentId,
	open,
	onOpenChange,
}: WebhookLogsDialogProps) {
	const [logs, setLogs] = useState<WebhookLog[]>([])
	const [loading, setLoading] = useState(false)
	const [total, setTotal] = useState(0)

	useEffect(() => {
		if (open) {
			setLoading(true)
			fetchWebhookLogs({ agentId, webhookId: webhook.id, workspaceId })
				.then((data) => {
					setLogs(data.logs)
					setTotal(data.total)
				})
				.catch(() => toast.error('Failed to load logs'))
				.finally(() => setLoading(false))
		}
	}, [open, webhook.id, agentId, workspaceId])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[80vh]">
				<DialogHeader>
					<DialogTitle>Delivery Logs</DialogTitle>
					<DialogDescription>
						Showing {logs.length} of {total} deliveries for this webhook
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="h-[500px]">
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					) : logs.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<Clock className="h-8 w-8 text-muted-foreground mb-2" />
							<p className="text-sm text-muted-foreground">No delivery logs yet</p>
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
			</DialogContent>
		</Dialog>
	)
}

// =============================================================================
// Main Page Component
// =============================================================================

function WebhooksPage() {
	const { id: agentId } = Route.useParams()
	const { activeWorkspace } = useWorkspace()

	const {
		data: agent,
		isLoading: agentLoading,
		error: agentError,
	} = useAgentQuery(agentId, activeWorkspace?.id)

	const [webhooks, setWebhooks] = useState<Webhook[]>([])
	const [loading, setLoading] = useState(true)
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [isEditOpen, setIsEditOpen] = useState(false)
	const [isDeleteOpen, setIsDeleteOpen] = useState(false)
	const [isLogsOpen, setIsLogsOpen] = useState(false)
	const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

	const loadWebhooks = useCallback(async () => {
		if (!activeWorkspace?.id) return
		try {
			const data = await fetchWebhooks({ agentId, workspaceId: activeWorkspace.id })
			setWebhooks(data)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to load webhooks')
		} finally {
			setLoading(false)
		}
	}, [agentId, activeWorkspace?.id])

	useEffect(() => {
		loadWebhooks()
	}, [loadWebhooks])

	const handleCreate = async (data: {
		url: string
		events: WebhookEventType[]
		description?: string
	}) => {
		if (!activeWorkspace?.id) return
		setIsSubmitting(true)
		try {
			await createWebhook({
				agentId,
				workspaceId: activeWorkspace.id,
				...data,
			})
			toast.success('Webhook created successfully')
			setIsCreateOpen(false)
			await loadWebhooks()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create webhook')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleUpdate = async (data: {
		url: string
		events: WebhookEventType[]
		description?: string
	}) => {
		if (!activeWorkspace?.id || !selectedWebhook) return
		setIsSubmitting(true)
		try {
			await updateWebhook({
				agentId,
				webhookId: selectedWebhook.id,
				workspaceId: activeWorkspace.id,
				data,
			})
			toast.success('Webhook updated successfully')
			setIsEditOpen(false)
			setSelectedWebhook(null)
			await loadWebhooks()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update webhook')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleDelete = async () => {
		if (!activeWorkspace?.id || !selectedWebhook) return
		setIsSubmitting(true)
		try {
			await deleteWebhook({
				agentId,
				webhookId: selectedWebhook.id,
				workspaceId: activeWorkspace.id,
			})
			toast.success('Webhook deleted successfully')
			setIsDeleteOpen(false)
			setSelectedWebhook(null)
			await loadWebhooks()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete webhook')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleRegenerateSecret = async (webhook: Webhook) => {
		if (!activeWorkspace?.id) return
		try {
			const newSecret = await regenerateSecret({
				agentId,
				webhookId: webhook.id,
				workspaceId: activeWorkspace.id,
			})
			setWebhooks((prev) =>
				prev.map((w) => (w.id === webhook.id ? { ...w, secret: newSecret } : w)),
			)
			toast.success('Secret regenerated successfully')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to regenerate secret')
		}
	}

	const handleToggleStatus = async (webhook: Webhook) => {
		if (!activeWorkspace?.id) return
		const newStatus = webhook.status === 'active' ? 'inactive' : 'active'
		try {
			await updateWebhook({
				agentId,
				webhookId: webhook.id,
				workspaceId: activeWorkspace.id,
				data: { status: newStatus },
			})
			await loadWebhooks()
			toast.success(`Webhook ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update webhook')
		}
	}

	const copyToClipboard = async (text: string) => {
		await navigator.clipboard.writeText(text)
		toast.success('Copied to clipboard')
	}

	if (agentLoading || loading) {
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
						isSubmitting={isSubmitting}
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
							isSubmitting={isSubmitting}
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
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
							{isSubmitting ? (
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
			{selectedWebhook && activeWorkspace?.id && (
				<WebhookLogsDialog
					webhook={selectedWebhook}
					workspaceId={activeWorkspace.id}
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
