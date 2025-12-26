import { Card, CardContent, CardHeader } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'

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

function ChartSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-64" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-[300px] w-full" />
			</CardContent>
		</Card>
	)
}

export default function AnalyticsLoading() {
	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-9 w-36" />
				<Skeleton className="h-9 w-24" />
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-4">
				<Skeleton className="h-10 w-[180px]" />
				<Skeleton className="h-10 w-[180px]" />
				<Skeleton className="h-10 w-[200px]" />
			</div>

			{/* Summary Stats */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCardSkeleton />
				<StatCardSkeleton />
				<StatCardSkeleton />
				<StatCardSkeleton />
			</div>

			{/* Token Usage Over Time */}
			<ChartSkeleton />

			{/* Usage by Agent and Model */}
			<div className="grid gap-4 md:grid-cols-2">
				<ChartSkeleton />
				<ChartSkeleton />
			</div>

			{/* Cost Trend */}
			<ChartSkeleton />

			{/* Request Volume */}
			<ChartSkeleton />
		</div>
	)
}
