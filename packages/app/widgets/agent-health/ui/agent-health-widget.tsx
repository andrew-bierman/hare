'use client'

import { Badge } from '@hare/ui/components/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hare/ui/components/card'
import { Skeleton } from '@hare/ui/components/skeleton'
import { Activity, AlertTriangle, Clock, ExternalLink, Zap } from 'lucide-react'
import { useAgentHealthQuery } from '../../../shared/api'

export interface AgentHealthWidgetProps {
	agentId: string
	basePath?: string
}

const HEALTH_STATUS_CONFIG = {
	healthy: {
		label: 'Healthy',
		dotColor: 'bg-emerald-500',
		badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
	},
	degraded: {
		label: 'Degraded',
		dotColor: 'bg-yellow-500',
		badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
	},
	unhealthy: {
		label: 'Unhealthy',
		dotColor: 'bg-red-500',
		badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
	},
} as const

function ProgressRing(props: { value: number; size?: number; strokeWidth?: number }) {
	const { value, size = 80, strokeWidth = 8 } = props
	const radius = (size - strokeWidth) / 2
	const circumference = radius * 2 * Math.PI
	const offset = circumference - (value / 100) * circumference

	const getColor = (val: number) => {
		if (val > 95) return 'stroke-emerald-500'
		if (val >= 80) return 'stroke-yellow-500'
		return 'stroke-red-500'
	}

	return (
		<div className="relative" style={{ width: size, height: size }}>
			<svg className="transform -rotate-90" width={size} height={size}>
				<title>Health score</title>
				<circle
					className="stroke-muted"
					strokeWidth={strokeWidth}
					fill="transparent"
					r={radius}
					cx={size / 2}
					cy={size / 2}
				/>
				<circle
					className={`transition-all duration-500 ${getColor(value)}`}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					fill="transparent"
					r={radius}
					cx={size / 2}
					cy={size / 2}
					style={{
						strokeDasharray: circumference,
						strokeDashoffset: offset,
					}}
				/>
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<span className="text-lg font-bold">{value.toFixed(1)}%</span>
			</div>
		</div>
	)
}

function HealthWidgetSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Skeleton className="h-5 w-5 rounded-full" />
						<Skeleton className="h-5 w-24" />
					</div>
					<Skeleton className="h-5 w-16" />
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-center">
					<Skeleton className="h-20 w-20 rounded-full" />
				</div>
				<div className="grid grid-cols-2 gap-4">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			</CardContent>
		</Card>
	)
}

export function AgentHealthWidget(props: AgentHealthWidgetProps) {
	const { agentId, basePath = '/dashboard' } = props

	const {
		data: health,
		isLoading,
		error,
	} = useAgentHealthQuery(agentId, { refetchInterval: 30000 })

	if (isLoading) {
		return <HealthWidgetSkeleton />
	}

	if (error || !health) {
		return (
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<Activity className="h-5 w-5 text-muted-foreground" />
						<CardTitle className="text-base">Agent Health</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">Unable to load health data</p>
				</CardContent>
			</Card>
		)
	}

	const statusConfig = HEALTH_STATUS_CONFIG[health.status]
	const { successRate, averageLatencyMs, errorCount, totalRequests } = health.metrics

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Activity className="h-5 w-5 text-muted-foreground" />
						<CardTitle className="text-base">Agent Health</CardTitle>
					</div>
					<div className="flex items-center gap-2">
						<span className={`h-2 w-2 rounded-full ${statusConfig.dotColor}`} />
						<Badge className={statusConfig.badgeClass}>{statusConfig.label}</Badge>
					</div>
				</div>
				<CardDescription>Last 24 hours ({totalRequests} requests)</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-center">
					<ProgressRing value={successRate} />
				</div>
				<p className="text-center text-sm text-muted-foreground">Success Rate</p>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex items-center gap-2 rounded-lg border p-3">
						<Clock className="h-4 w-4 text-muted-foreground" />
						<div>
							<p className="text-sm font-medium">{averageLatencyMs}ms</p>
							<p className="text-xs text-muted-foreground">Avg Latency</p>
						</div>
					</div>
					<div className="flex items-center gap-2 rounded-lg border p-3">
						<Zap className="h-4 w-4 text-muted-foreground" />
						<div>
							<div className="flex items-center gap-2">
								<p className="text-sm font-medium">{errorCount}</p>
								{errorCount > 0 && (
									<Badge variant="destructive" className="h-5 px-1.5 text-xs">
										{errorCount}
									</Badge>
								)}
							</div>
							<p className="text-xs text-muted-foreground">Errors</p>
						</div>
					</div>
				</div>

				{errorCount > 0 && (
					<a
						href={`${basePath}/settings/audit-logs?resourceType=agent&resourceId=${agentId}`}
						className="flex items-center justify-center gap-1 text-sm text-primary hover:underline"
					>
						<AlertTriangle className="h-4 w-4" />
						View detailed logs
						<ExternalLink className="h-3 w-3" />
					</a>
				)}
			</CardContent>
		</Card>
	)
}
