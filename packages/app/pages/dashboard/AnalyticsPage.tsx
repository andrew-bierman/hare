'use client'

import { Button } from '@hare/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@hare/ui/components/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@hare/ui/components/dropdown-menu'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@hare/ui/components/select'
import { Skeleton } from '@hare/ui/components/skeleton'
import {
	AlertTriangle,
	ArrowDownToLine,
	BarChart3,
	Calendar,
	DollarSign,
	TrendingDown,
	TrendingUp,
	Zap,
} from 'lucide-react'
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
import { useWorkspace } from '../../app/providers'
import { exportToCSV, exportToJSON } from '../../shared'
import { useAgentsQuery, useAnalyticsQuery } from '../../shared/api'
import { ChartContainer } from '../../widgets'

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

// Budget threshold for warning display (can be made configurable later)
const MONTHLY_BUDGET_THRESHOLD = 100

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

export function AnalyticsPage() {
	const { isLoading: workspaceLoading } = useWorkspace()
	const [dateRange, setDateRange] = useState('30d')
	const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
	const [selectedAgentId, setSelectedAgentId] = useState<string>('all')

	const { data: agentsData } = useAgentsQuery()
	const agents = agentsData?.agents ?? []

	// Calculate date range
	const { startDate, endDate, daysInPeriod } = useMemo(() => {
		const end = new Date()
		const start = new Date()
		let days = 30

		switch (dateRange) {
			case '7d':
				start.setDate(start.getDate() - 7)
				days = 7
				break
			case '30d':
				start.setDate(start.getDate() - 30)
				days = 30
				break
			case '90d':
				start.setDate(start.getDate() - 90)
				days = 90
				break
		}

		return {
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			daysInPeriod: days,
		}
	}, [dateRange])

	// Calculate previous month date range for comparison
	const { prevMonthStartDate, prevMonthEndDate } = useMemo(() => {
		const now = new Date()
		const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0) // Last day of previous month
		const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1) // First day of previous month

		return {
			prevMonthStartDate: prevMonthStart.toISOString(),
			prevMonthEndDate: prevMonthEnd.toISOString(),
		}
	}, [])

	const { data: analyticsData, isLoading: analyticsLoading } = useAnalyticsQuery({
		startDate,
		endDate,
		agentId: selectedAgentId === 'all' ? undefined : selectedAgentId,
		groupBy,
	})

	// Fetch previous month data for comparison
	const { data: prevMonthData } = useAnalyticsQuery({
		startDate: prevMonthStartDate,
		endDate: prevMonthEndDate,
		agentId: selectedAgentId === 'all' ? undefined : selectedAgentId,
		groupBy: 'month',
	})

	const isLoading = workspaceLoading || analyticsLoading

	// Calculate projected monthly cost
	const projectedCost = useMemo(() => {
		const currentCost = analyticsData?.summary.totalCost ?? 0
		const now = new Date()
		const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

		// Calculate days elapsed in the current period
		// For 30-day view, we use the full period cost and project to a full month
		// For other views, we calculate based on elapsed days in the selection
		const daysElapsed = daysInPeriod
		const dailyRate = daysElapsed > 0 ? currentCost / daysElapsed : 0
		const projected = dailyRate * daysInMonth

		return projected
	}, [analyticsData?.summary.totalCost, daysInPeriod])

	// Calculate percentage change from last month
	const projectionComparison = useMemo(() => {
		const lastMonthCost = prevMonthData?.summary.totalCost ?? 0
		if (lastMonthCost === 0) {
			return projectedCost > 0 ? 100 : 0
		}
		return ((projectedCost - lastMonthCost) / lastMonthCost) * 100
	}, [projectedCost, prevMonthData?.summary.totalCost])

	// Check if projection exceeds budget threshold
	const exceedsBudget = projectedCost > MONTHLY_BUDGET_THRESHOLD

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

	// Format percentage change with sign
	const formatPercentChange = (percent: number) => {
		const sign = percent >= 0 ? '+' : ''
		return `${sign}${percent.toFixed(1)}%`
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
						{agents.map((agent: { id: string; name: string }) => (
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

			{/* Projected Cost Card */}
			{isLoading ? (
				<StatCardSkeleton />
			) : (
				<Card className={exceedsBudget ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : ''}>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Projected Monthly Cost</CardTitle>
						<div className="flex items-center gap-2">
							{exceedsBudget && <AlertTriangle className="h-4 w-4 text-amber-500" />}
							{projectionComparison >= 0 ? (
								<TrendingUp className="h-4 w-4 text-rose-500" />
							) : (
								<TrendingDown className="h-4 w-4 text-emerald-500" />
							)}
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{formatCurrency(projectedCost)}</div>
						<div className="flex items-center gap-2 mt-1">
							<span
								className={`text-xs font-medium ${projectionComparison >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}
							>
								{formatPercentChange(projectionComparison)} vs last month
							</span>
							{exceedsBudget && (
								<span className="text-xs text-amber-600 dark:text-amber-400">
									(exceeds ${MONTHLY_BUDGET_THRESHOLD} threshold)
								</span>
							)}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							Based on {daysInPeriod}-day average: {formatCurrency(projectedCost / 30)}/day
						</p>
					</CardContent>
				</Card>
			)}

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
							tickFormatter={(value: string) =>
								new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
							}
						/>
						<YAxis />
						<Tooltip
							labelFormatter={(value) => new Date(value as string).toLocaleDateString()}
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
					description="Token distribution and cost across agents"
					isLoading={isLoading}
					isEmpty={!analyticsData?.byAgent.length}
				>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart data={analyticsData?.byAgent.slice(0, 10)} layout="vertical">
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis type="number" />
							<YAxis dataKey="agentName" type="category" width={100} />
							<Tooltip
								formatter={(value, name) => [
									formatNumber(value as number),
									name === 'Input' ? 'Input Tokens' : 'Output Tokens',
								]}
								labelFormatter={(label, payload) => {
									const data = payload?.[0]?.payload as
										| { agentName: string; cost: number }
										| undefined
									return data ? `${data.agentName} (${formatCurrency(data.cost)})` : label
								}}
							/>
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
								label={(entry) => {
									const e = entry as unknown as { modelName: string; totalTokens: number }
									return `${e.modelName}: ${formatNumber(e.totalTokens)}`
								}}
							>
								{analyticsData?.byModel.map((model: { modelName: string }, index: number) => (
									<Cell key={model.modelName} fill={CHART_COLORS[index % CHART_COLORS.length]} />
								))}
							</Pie>
							<Tooltip formatter={(value) => formatNumber(value as number)} />
						</PieChart>
					</ResponsiveContainer>
				</ChartContainer>
			</div>

			{/* Cost by Agent */}
			<ChartContainer
				title="Cost by Agent"
				description="Spending breakdown by agent (sorted by cost)"
				isLoading={isLoading}
				isEmpty={!analyticsData?.byAgent.length}
			>
				<ResponsiveContainer width="100%" height={300}>
					<BarChart
						data={[...(analyticsData?.byAgent ?? [])].sort((a, b) => b.cost - a.cost).slice(0, 10)}
						layout="vertical"
					>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis type="number" tickFormatter={(value: number) => `$${value.toFixed(2)}`} />
						<YAxis dataKey="agentName" type="category" width={120} />
						<Tooltip formatter={(value) => formatCurrency(value as number)} />
						<Bar dataKey="cost" fill={CHART_COLORS[3]} name="Cost">
							{[...(analyticsData?.byAgent ?? [])]
								.sort((a, b) => b.cost - a.cost)
								.slice(0, 10)
								.map((agent, index) => (
									<Cell key={agent.agentId} fill={CHART_COLORS[index % CHART_COLORS.length]} />
								))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</ChartContainer>

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
							tickFormatter={(value: string) =>
								new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
							}
						/>
						<YAxis tickFormatter={(value: number) => `$${value.toFixed(2)}`} />
						<Tooltip
							labelFormatter={(value) => new Date(value as string).toLocaleDateString()}
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
							tickFormatter={(value: string) =>
								new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
							}
						/>
						<YAxis />
						<Tooltip
							labelFormatter={(value) => new Date(value as string).toLocaleDateString()}
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
