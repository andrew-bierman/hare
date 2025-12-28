import { Skeleton } from '@workspace/ui/components/skeleton'
import { Loader2 } from 'lucide-react'

export function PendingComponent() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center">
			<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			<p className="mt-4 text-sm text-muted-foreground">Loading...</p>
		</div>
	)
}

export function DashboardPendingComponent() {
	return (
		<div className="p-6 space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-96" />
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={`skeleton-${i}`} className="rounded-lg border p-6 space-y-3">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
					</div>
				))}
			</div>
		</div>
	)
}
