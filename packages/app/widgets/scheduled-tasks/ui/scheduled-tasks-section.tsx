'use client'

import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@hare/ui/components/card'
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
import {
	Calendar,
	CheckCircle,
	Clock,
	Loader2,
	Pause,
	Play,
	Plus,
	RefreshCw,
	Trash2,
	XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Schedule, ScheduleExecution } from '@hare/types'
import {
	useAgentExecutionsQuery,
	useCreateScheduleMutation,
	useDeleteScheduleMutation,
	useSchedulesQuery,
	useUpdateScheduleMutation,
} from '../../../shared/api/hooks'

export interface ScheduledTasksSectionProps {
	agentId: string
}

// Available actions for scheduling
const SCHEDULE_ACTIONS = [
	{ id: 'sendReminder', name: 'Send Reminder', description: 'Send a reminder message' },
	{ id: 'runMaintenance', name: 'Run Maintenance', description: 'Clean up old messages' },
] as const

// Common cron presets
const CRON_PRESETS = [
	{ label: 'Every minute', value: '* * * * *' },
	{ label: 'Every hour', value: '0 * * * *' },
	{ label: 'Every day at midnight', value: '0 0 * * *' },
	{ label: 'Every Monday at 9am', value: '0 9 * * 1' },
	{ label: 'Every month on the 1st', value: '0 0 1 * *' },
] as const

function getStatusBadge(status: Schedule['status']) {
	switch (status) {
		case 'active':
			return (
				<Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
					<Play className="mr-1 h-3 w-3" />
					Active
				</Badge>
			)
		case 'paused':
			return (
				<Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
					<Pause className="mr-1 h-3 w-3" />
					Paused
				</Badge>
			)
		case 'completed':
			return (
				<Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
					<CheckCircle className="mr-1 h-3 w-3" />
					Completed
				</Badge>
			)
		case 'cancelled':
			return (
				<Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
					<XCircle className="mr-1 h-3 w-3" />
					Cancelled
				</Badge>
			)
		default:
			return (
				<Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
					<Clock className="mr-1 h-3 w-3" />
					Pending
				</Badge>
			)
	}
}

function getExecutionStatusBadge(status: ScheduleExecution['status']) {
	switch (status) {
		case 'completed':
			return (
				<Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
					<CheckCircle className="mr-1 h-3 w-3" />
					Completed
				</Badge>
			)
		case 'failed':
			return (
				<Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
					<XCircle className="mr-1 h-3 w-3" />
					Failed
				</Badge>
			)
		default:
			return (
				<Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
					<Loader2 className="mr-1 h-3 w-3 animate-spin" />
					Running
				</Badge>
			)
	}
}

function formatDate(dateString: string | null): string {
	if (!dateString) return '-'
	return new Date(dateString).toLocaleString()
}

function formatDuration(ms: number | null): string {
	if (ms === null) return '-'
	if (ms < 1000) return `${ms}ms`
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
	return `${(ms / 60000).toFixed(1)}m`
}

export function ScheduledTasksSection({ agentId }: ScheduledTasksSectionProps) {
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [scheduleType, setScheduleType] = useState<'one-time' | 'recurring'>('one-time')
	const [executeAt, setExecuteAt] = useState('')
	const [cron, setCron] = useState('')
	const [action, setAction] = useState('')
	const [reminderMessage, setReminderMessage] = useState('')

	const { data: schedulesData, isLoading: schedulesLoading } = useSchedulesQuery(agentId)
	const { data: executionsData, isLoading: executionsLoading } = useAgentExecutionsQuery({
		agentId,
		limit: 10,
	})

	const createSchedule = useCreateScheduleMutation()
	const updateSchedule = useUpdateScheduleMutation()
	const deleteSchedule = useDeleteScheduleMutation()

	const schedules = schedulesData?.schedules ?? []
	const executions = executionsData?.executions ?? []

	const handleCreate = async () => {
		try {
			const payload: Record<string, unknown> = {}
			if (action === 'sendReminder' && reminderMessage) {
				payload.message = reminderMessage
			}

			await createSchedule.mutateAsync({
				agentId,
				type: scheduleType,
				action,
				executeAt: scheduleType === 'one-time' ? new Date(executeAt).toISOString() : undefined,
				cron: scheduleType === 'recurring' ? cron : undefined,
				payload: Object.keys(payload).length > 0 ? payload : undefined,
			})

			toast.success('Schedule created successfully')
			setIsCreateOpen(false)
			resetForm()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create schedule')
		}
	}

	const handleTogglePause = async (schedule: Schedule) => {
		try {
			const newStatus = schedule.status === 'paused' ? 'active' : 'paused'
			await updateSchedule.mutateAsync({
				id: schedule.id,
				status: newStatus,
			})
			toast.success(`Schedule ${newStatus === 'paused' ? 'paused' : 'resumed'}`)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update schedule')
		}
	}

	const handleDelete = async (scheduleId: string) => {
		try {
			await deleteSchedule.mutateAsync({ id: scheduleId })
			toast.success('Schedule deleted')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete schedule')
		}
	}

	const resetForm = () => {
		setScheduleType('one-time')
		setExecuteAt('')
		setCron('')
		setAction('')
		setReminderMessage('')
	}

	const isFormValid = action && (scheduleType === 'one-time' ? executeAt : cron)

	return (
		<div className="space-y-6">
			{/* Scheduled Tasks */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Scheduled Tasks</CardTitle>
						<CardDescription>
							Configure tasks to run at specific times or on a recurring schedule
						</CardDescription>
					</div>
					<Button onClick={() => setIsCreateOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Create Schedule
					</Button>
				</CardHeader>
				<CardContent>
					{schedulesLoading ? (
						<div className="space-y-3">
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</div>
					) : schedules.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<Clock className="h-12 w-12 text-muted-foreground mb-4" />
							<p className="text-muted-foreground">No scheduled tasks yet</p>
							<p className="text-sm text-muted-foreground mt-1">
								Create a schedule to automate agent tasks
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{schedules.map((schedule) => (
								<div
									key={schedule.id}
									className="flex items-center justify-between p-4 border rounded-lg"
								>
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<span className="font-medium">{schedule.action}</span>
											{getStatusBadge(schedule.status)}
											<Badge variant="outline">
												{schedule.type === 'recurring' ? (
													<>
														<RefreshCw className="mr-1 h-3 w-3" />
														Recurring
													</>
												) : (
													<>
														<Calendar className="mr-1 h-3 w-3" />
														One-time
													</>
												)}
											</Badge>
										</div>
										<div className="text-sm text-muted-foreground space-y-1">
											{schedule.type === 'recurring' && schedule.cron && (
												<p>Cron: {schedule.cron}</p>
											)}
											{schedule.nextExecuteAt && (
												<p>Next run: {formatDate(schedule.nextExecuteAt)}</p>
											)}
											{schedule.lastExecutedAt && (
												<p>Last run: {formatDate(schedule.lastExecutedAt)}</p>
											)}
											<p>Executions: {schedule.executionCount}</p>
										</div>
									</div>
									<div className="flex gap-2">
										{schedule.status !== 'completed' && schedule.status !== 'cancelled' && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleTogglePause(schedule)}
												disabled={updateSchedule.isPending}
											>
												{schedule.status === 'paused' ? (
													<>
														<Play className="mr-1 h-4 w-4" />
														Resume
													</>
												) : (
													<>
														<Pause className="mr-1 h-4 w-4" />
														Pause
													</>
												)}
											</Button>
										)}
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleDelete(schedule.id)}
											disabled={deleteSchedule.isPending}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Execution History */}
			<Card>
				<CardHeader>
					<CardTitle>Execution History</CardTitle>
					<CardDescription>Recent task executions and their results</CardDescription>
				</CardHeader>
				<CardContent>
					{executionsLoading ? (
						<div className="space-y-3">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</div>
					) : executions.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
							<p className="text-muted-foreground">No executions yet</p>
							<p className="text-sm text-muted-foreground mt-1">
								Execution history will appear here once schedules run
							</p>
						</div>
					) : (
						<div className="space-y-2">
							{/* Header */}
							<div className="grid grid-cols-5 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
								<div>Started</div>
								<div>Status</div>
								<div>Duration</div>
								<div>Result</div>
								<div>Error</div>
							</div>
							{/* Rows */}
							{executions.map((execution) => (
								<div
									key={execution.id}
									className="grid grid-cols-5 gap-4 px-4 py-3 text-sm border-b last:border-0"
								>
									<div>{formatDate(execution.startedAt)}</div>
									<div>{getExecutionStatusBadge(execution.status)}</div>
									<div>{formatDuration(execution.durationMs)}</div>
									<div className="truncate">
										{execution.result?.message || execution.result?.success ? 'Success' : '-'}
									</div>
									<div className="truncate text-red-600 dark:text-red-400">
										{execution.error || '-'}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Create Schedule Dialog */}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Create Scheduled Task</DialogTitle>
						<DialogDescription>
							Schedule a task to run at a specific time or on a recurring schedule
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{/* Schedule Type */}
						<div className="space-y-2">
							<Label>Schedule Type</Label>
							<Select
								value={scheduleType}
								onValueChange={(value: 'one-time' | 'recurring') => setScheduleType(value)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="one-time">One-time</SelectItem>
									<SelectItem value="recurring">Recurring</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Action */}
						<div className="space-y-2">
							<Label>Action</Label>
							<Select value={action} onValueChange={setAction}>
								<SelectTrigger>
									<SelectValue placeholder="Select an action" />
								</SelectTrigger>
								<SelectContent>
									{SCHEDULE_ACTIONS.map((a) => (
										<SelectItem key={a.id} value={a.id}>
											<div className="flex flex-col">
												<span>{a.name}</span>
												<span className="text-xs text-muted-foreground">{a.description}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Reminder Message (conditional) */}
						{action === 'sendReminder' && (
							<div className="space-y-2">
								<Label>Reminder Message</Label>
								<Input
									value={reminderMessage}
									onChange={(e) => setReminderMessage(e.target.value)}
									placeholder="Enter reminder message"
								/>
							</div>
						)}

						{/* Execute At (for one-time) */}
						{scheduleType === 'one-time' && (
							<div className="space-y-2">
								<Label>Execute At</Label>
								<Input
									type="datetime-local"
									value={executeAt}
									onChange={(e) => setExecuteAt(e.target.value)}
								/>
							</div>
						)}

						{/* Cron Expression (for recurring) */}
						{scheduleType === 'recurring' && (
							<div className="space-y-2">
								<Label>Cron Expression</Label>
								<Input
									value={cron}
									onChange={(e) => setCron(e.target.value)}
									placeholder="* * * * *"
								/>
								<div className="flex flex-wrap gap-2 mt-2">
									{CRON_PRESETS.map((preset) => (
										<Button
											key={preset.value}
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setCron(preset.value)}
										>
											{preset.label}
										</Button>
									))}
								</div>
								<p className="text-xs text-muted-foreground">
									Format: minute hour day month weekday
								</p>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsCreateOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleCreate} disabled={!isFormValid || createSchedule.isPending}>
							{createSchedule.isPending ? 'Creating...' : 'Create Schedule'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
