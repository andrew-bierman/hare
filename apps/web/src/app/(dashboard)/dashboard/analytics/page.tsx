'use client'

import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@workspace/ui/components/select'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ArrowDownToLine, BarChart3, Calendar, DollarSign, TrendingUp, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'
import { ChartContainer } from 'web-app/components/charts'
import { useWorkspace } from 'web-app/components/providers/workspace-provider'
import { type Agent, useAgents, useAnalytics } from 'web-app/lib/api/hooks'
import { exportToCSV, exportToJSON } from 'web-app/lib/utils/export'

const DATE_RANGES = [
	{ value: '7d', label: 'Last 7 days' },
	{ value: '30d', label: 'Last 30 days' },
	{ value: '90d', label: 'Last 90 days' },
]

const GROUP_BY_OPTIONS = [
	{ value: 'day', label: 'Daily' },
	{ value: 'week', label: 'Weekly' },
	{ value: 'month', label: 'Monthly' },
]

const CHART_COLORS = [
	'hsl(var(--chart-1))',
	'hsl(var(--chart-2))',
	'hsl(var(--chart-3))',
	'hsl(var(--chart-4))',
	'hsl(var(--chart-5))',
]

function StatCardSkeleton() {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-4 w-4" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-8 w-20 mb-1" />
				<Skeleton className="h-3 w-28" />
			</CardContent>
		</Card>
	)
}

export default function AnalyticsPage() {
	const { activeWorkspace, isLoading: workspaceLoading } = useWorkspace()
	const [dateRange, setDateRange] = useState('30d')
	const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
	const [selectedAgentId, setSelectedAgentId] = useState<string>('all')

	const { data: agentsData } = useAgents(activeWorkspace?.id)
	const agents: Agent[] = agentsData?.agents ?? []

	// Calculate date range
	const { startDate, endDate } = useMemo(() => {
		const end = new Date()
		const start = new Date()

		switch (dateRange) {
			case '7d':
				start.setDate(start.getDate() - 7)
				break
			case '30d':
				start.setDate(start.getDate() - 30)
				break
			case '90d':
				start.setDate(start.getDate() - 90)
				break
		}

		return {
			startDate: start.toISOString(),
			endDate: end.toISOString(),
		}
	}, [dateRange])

	const { data: analyticsData, isLoading: analyticsLoading } = useAnalytics(activeWorkspace?.id, {
		startDate,
		endDate,
		agentId: selectedAgentId === 'all' ? undefined : selectedAgentId,
		groupBy,
	})

	const isLoading = workspaceLoading || analyticsLoading

	const formatNumber = (num: number) => {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
		return num.toString()
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
		}).format(amount)
	}

	const handleExport = (format: 'csv' | 'json') => {
		if (!analyticsData) return

		if (format === 'csv') {
			exportToCSV(
				analyticsData.timeSeries as unknown as Record<string, unknown>[],
				'analytics-timeseries',
			)
		} else {
			exportToJSON(analyticsData, 'analytics')
		}
	}

	const stats = [
		{
			title: 'Total Requests',
			value: formatNumber(analyticsData?.summary.totalRequests ?? 0),
			description: 'API calls in period',
			icon: BarChart3,
			color: 'text-blue-500',
		},
		{
			title: 'Total Tokens',
			value: formatNumber(analyticsData?.summary.totalTokens ?? 0),
			description: `${formatNumber(analyticsData?.summary.totalInputTokens ?? 0)} in / ${formatNumber(analyticsData?.summary.totalOutputTokens ?? 0)} out`,
			icon: TrendingUp,
			color: 'text-emerald-500',
		},
		{
			title: 'Total Cost',
			value: formatCurrency(analyticsData?.summary.totalCost ?? 0),
			description: 'Estimated spend',
			icon: DollarSign,
			color: 'text-violet-500',
		},
		{
			title: 'Avg Latency',
			value: `${analyticsData?.summary.avgLatencyMs ?? 0}ms`,
			description: 'Response time',
			icon: Zap,
			color: 'text-orange-500',
		},
	]

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								<ArrowDownToLine className="h-4 w-4 mr-2" />
								Export
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleExport('json')}>
								Export as JSON
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-4">
				<Select value={dateRange} onValueChange={setDateRange}>
					<SelectTrigger className="w-[180px]">
						<Calendar className="h-4 w-4 mr-2" />
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{DATE_RANGES.map((range) => (
							<SelectItem key={range.value} value={range.value}>
								{range.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'day' | 'week' | 'month')}>
					<SelectTrigger className="w-[180px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{GROUP_BY_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
					<SelectTrigger className="w-[200px]">
						<SelectValue placeholder="All agents" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All agents</SelectItem>
						{agents.map((agent) => (
							<SelectItem key={agent.id} value={agent.id}>
								{agent.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Summary Stats */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{isLoading
					? ['analytics-sk-1', 'analytics-sk-2', 'analytics-sk-3', 'analytics-sk-4'].map((id) => (
							<StatCardSkeleton key={id} />
						))
					: stats.map((stat) => (
							<Card key={stat.title}>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
									<stat.icon className={`h-4 w-4 ${stat.color}`} />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{stat.value}</div>
									<p className="text-xs text-muted-foreground">{stat.description}</p>
								</CardContent>
							</Card>
						))}
			</div>

			{/* Token Usage Over Time */}
			<ChartContainer
				title="Token Usage Over Time"
				description="Input and output tokens trend"
				isLoading={isLoading}
				isEmpty={!analyticsData?.timeSeries.length}
			>
				<ResponsiveContainer width="100%" height={300}>
					<LineChart data={analyticsData?.timeSeries}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							dataKey="date"
							tickFormatter={(value) =>
								new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
							}
						/>
						<YAxis />
						<Tooltip
							labelFormatter={(value) => new Date(value).toLocaleDateString()}
							formatter={(value) => formatNumber(value as number)}
						/>
						<Legend />
						<Line
							type="monotone"
							dataKey="inputTokens"
							stroke={CHART_COLORS[0]}
							name="Input Tokens"
							strokeWidth={2}
						/>
						<Line
							type="monotone"
							dataKey="outputTokens"
							stroke={CHART_COLORS[1]}
							name="Output Tokens"
							strokeWidth={2}
						/>
					</LineChart>
				</ResponsiveContainer>
			</ChartContainer>

			<div className="grid gap-4 md:grid-cols-2">
				{/* Usage by Agent */}
				<ChartContainer
					title="Usage by Agent"
					description="Token distribution across agents"
					isLoading={isLoading}
					isEmpty={!analyticsData?.byAgent.length}
				>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart data={analyticsData?.byAgent.slice(0, 10)} layout="vertical">
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis type="number" />
							<YAxis dataKey="agentName" type="category" width={100} />
							<Tooltip formatter={(value) => formatNumber(value as number)} />
							<Legend />
							<Bar dataKey="inputTokens" stackId="a" fill={CHART_COLORS[0]} name="Input" />
							<Bar dataKey="outputTokens" stackId="a" fill={CHART_COLORS[1]} name="Output" />
						</BarChart>
					</ResponsiveContainer>
				</ChartContainer>

				{/* Usage by Model */}
				<ChartContainer
					title="Usage by Model"
					description="Token distribution across AI models"
					isLoading={isLoading}
					isEmpty={!analyticsData?.byModel.length}
				>
					<ResponsiveContainer width="100%" height={300}>
						<PieChart>
							<Pie
								data={analyticsData?.byModel as unknown as Record<string, unknown>[] | undefined}
								dataKey="totalTokens"
								nameKey="modelName"
								cx="50%"
								cy="50%"
								outerRadius={80}
								label={(entry) =>
									`${(entry as unknown as Record<string, unknown>).modelName}: ${formatNumber((entry as unknown as Record<string, unknown>).totalTokens as number)}`
								}
							>
								{analyticsData?.byModel.map((model) => (
									<Cell
										key={model.modelName}
										fill={CHART_COLORS[analyticsData.byModel.indexOf(model) % CHART_COLORS.length]}
									/>
								))}
							</Pie>
							<Tooltip formatter={(value) => formatNumber(value as number)} />
						</PieChart>
					</ResponsiveContainer>
				</ChartContainer>
			</div>

			{/* Cost Trend */}
			<ChartContainer
				title="Cost Trend"
				description="Estimated API costs over time"
				isLoading={isLoading}
				isEmpty={!analyticsData?.timeSeries.length}
			>
				<ResponsiveContainer width="100%" height={300}>
					<LineChart data={analyticsData?.timeSeries}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							dataKey="date"
							tickFormatter={(value) =>
								new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
							}
						/>
						<YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} />
						<Tooltip
							labelFormatter={(value) => new Date(value).toLocaleDateString()}
							formatter={(value) => formatCurrency(value as number)}
						/>
						<Legend />
						<Line
							type="monotone"
							dataKey="cost"
							stroke={CHART_COLORS[3]}
							name="Cost"
							strokeWidth={2}
						/>
					</LineChart>
				</ResponsiveContainer>
			</ChartContainer>

			{/* Request Count */}
			<ChartContainer
				title="Request Volume"
				description="API calls over time"
				isLoading={isLoading}
				isEmpty={!analyticsData?.timeSeries.length}
			>
				<ResponsiveContainer width="100%" height={300}>
					<BarChart data={analyticsData?.timeSeries}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							dataKey="date"
							tickFormatter={(value) =>
								new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
							}
						/>
						<YAxis />
						<Tooltip
							labelFormatter={(value) => new Date(value).toLocaleDateString()}
							formatter={(value) => formatNumber(value as number)}
						/>
						<Legend />
						<Bar dataKey="requests" fill={CHART_COLORS[2]} name="Requests" />
					</BarChart>
				</ResponsiveContainer>
			</ChartContainer>
		</div>
	)
}
