'use client'

import { useState } from 'react'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hare/ui/components/card'
import { ScrollArea } from '@hare/ui/components/scroll-area'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@hare/ui/components/select'
import { Skeleton } from '@hare/ui/components/skeleton'
import {
	AlertCircle,
	Bot,
	ChevronDown,
	ChevronUp,
	Clock,
	RefreshCw,
	Wrench,
	Zap,
} from 'lucide-react'
import { useActivityFeedQuery, useAgentsQuery } from '../../../shared/api'

export interface ActivityFeedWidgetProps {
	/** Maximum number of events to display */
	limit?: number
	/** Height of the scrollable area */
	height?: string
	/** Auto-refresh interval in milliseconds (default: 10000) */
	refreshInterval?: number
}

type ActivityEventType = 'agent.invocation' | 'tool.call' | 'error'

interface ActivityEvent {
	id: string
	workspaceId: string
	agentId: string | null
	eventType: ActivityEventType
	agentName: string | null
	summary: string
	details: Record<string, unknown> | null
	createdAt: string
}

const EVENT_TYPE_CONFIG: Record<
	ActivityEventType,
	{ label: string; icon: typeof Bot; color: string; badgeClass: string }
> = {
	'agent.invocation': {
		label: 'Invocation',
		icon: Bot,
		color: 'text-violet-500',
		badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
	},
	'tool.call': {
		label: 'Tool Call',
		icon: Wrench,
		color: 'text-blue-500',
		badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
	},
	error: {
		label: 'Error',
		icon: AlertCircle,
		color: 'text-red-500',
		badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
	},
}

function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffSeconds = Math.floor(diffMs / 1000)
	const diffMinutes = Math.floor(diffSeconds / 60)
	const diffHours = Math.floor(diffMinutes / 60)
	const diffDays = Math.floor(diffHours / 24)

	if (diffSeconds < 60) return 'just now'
	if (diffMinutes < 60) return `${diffMinutes}m ago`
	if (diffHours < 24) return `${diffHours}h ago`
	if (diffDays < 7) return `${diffDays}d ago`
	return date.toLocaleDateString()
}

function ActivityFeedSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Skeleton className="h-5 w-5" />
						<Skeleton className="h-5 w-24" />
					</div>
					<Skeleton className="h-8 w-32" />
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={`skeleton-${i}`} className="flex items-start gap-3 p-3 rounded-lg border">
							<Skeleton className="h-8 w-8 rounded-lg" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
							<Skeleton className="h-4 w-12" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

function ActivityEventItem(props: {
	event: ActivityEvent
	expanded: boolean
	onToggle: () => void
}) {
	const { event, expanded, onToggle } = props
	const config = EVENT_TYPE_CONFIG[event.eventType]
	const IconComponent = config.icon

	return (
		<div className="rounded-lg border bg-card transition-colors hover:bg-muted/50">
			<button
				type="button"
				onClick={onToggle}
				className="w-full p-3 text-left"
			>
				<div className="flex items-start gap-3">
					<div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-muted ${config.color}`}>
						<IconComponent className="h-4 w-4" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							{event.agentName && (
								<span className="font-medium text-sm truncate">{event.agentName}</span>
							)}
							<Badge className={`${config.badgeClass} text-xs`}>{config.label}</Badge>
						</div>
						<p className="text-sm text-muted-foreground line-clamp-1">{event.summary}</p>
					</div>
					<div className="flex items-center gap-2 flex-shrink-0">
						<span className="flex items-center gap-1 text-xs text-muted-foreground">
							<Clock className="h-3 w-3" />
							{formatRelativeTime(event.createdAt)}
						</span>
						{expanded ? (
							<ChevronUp className="h-4 w-4 text-muted-foreground" />
						) : (
							<ChevronDown className="h-4 w-4 text-muted-foreground" />
						)}
					</div>
				</div>
			</button>
			{expanded && event.details && (
				<div className="px-3 pb-3 pt-0">
					<div className="rounded-md bg-muted p-3 mt-2">
						<pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
							{JSON.stringify(event.details, null, 2)}
						</pre>
					</div>
				</div>
			)}
		</div>
	)
}

export function ActivityFeedWidget(props: ActivityFeedWidgetProps) {
	const { limit = 20, height = '400px', refreshInterval = 10000 } = props

	const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined)
	const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

	const { data: agentsData } = useAgentsQuery()
	const {
		data: activityData,
		isLoading,
		error,
		refetch,
		isFetching,
	} = useActivityFeedQuery({
		agentId: selectedAgentId,
		limit,
		refetchInterval: refreshInterval,
	})

	const agents = agentsData?.agents ?? []
	const events = activityData?.events ?? []

	if (isLoading) {
		return <ActivityFeedSkeleton />
	}

	if (error) {
		return (
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<Zap className="h-5 w-5 text-muted-foreground" />
						<CardTitle className="text-base">Activity Feed</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">Unable to load activity data</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Zap className="h-5 w-5 text-muted-foreground" />
						<CardTitle className="text-base">Activity Feed</CardTitle>
					</div>
					<div className="flex items-center gap-2">
						<Select
							value={selectedAgentId ?? 'all'}
							onValueChange={(value) => setSelectedAgentId(value === 'all' ? undefined : value)}
						>
							<SelectTrigger className="w-[160px] h-8">
								<SelectValue placeholder="All Agents" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Agents</SelectItem>
								{agents.map((agent) => (
									<SelectItem key={agent.id} value={agent.id}>
										{agent.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={() => refetch()}
							disabled={isFetching}
						>
							<RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
						</Button>
					</div>
				</div>
				<CardDescription>
					{activityData?.total ?? 0} total events
					{selectedAgentId && agents.find((a) => a.id === selectedAgentId)
						? ` for ${agents.find((a) => a.id === selectedAgentId)?.name}`
						: ''}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{events.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
							<Zap className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="text-sm font-medium mb-1">No activity yet</p>
						<p className="text-xs text-muted-foreground">
							Events will appear here when your agents run
						</p>
					</div>
				) : (
					<ScrollArea style={{ height }}>
						<div className="space-y-2 pr-4">
							{events.map((event) => (
								<ActivityEventItem
									key={event.id}
									event={event}
									expanded={expandedEventId === event.id}
									onToggle={() =>
										setExpandedEventId(expandedEventId === event.id ? null : event.id)
									}
								/>
							))}
						</div>
					</ScrollArea>
				)}
			</CardContent>
		</Card>
	)
}
