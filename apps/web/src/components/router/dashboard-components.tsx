import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router'
import { Button } from '@hare/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@hare/ui/components/card'
import { AlertTriangle, ArrowLeft, FileQuestion, Rabbit, RefreshCw } from 'lucide-react'

export function DashboardErrorComponent({ error, reset }: ErrorComponentProps) {
	const router = useRouter()
	const isDev = import.meta.env.DEV

	const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
	const errorStack = error instanceof Error ? error.stack : undefined

	const handleRetry = () => {
		if (reset) {
			reset()
		} else {
			router.invalidate()
		}
	}

	return (
		<div className="p-6">
			<Card className="max-w-2xl mx-auto">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
							<AlertTriangle className="h-8 w-8 text-destructive" />
						</div>
					</div>
					<CardTitle className="text-2xl">Something went wrong</CardTitle>
					<CardDescription className="text-base">{errorMessage}</CardDescription>
				</CardHeader>

				<CardContent className="space-y-4">
					{isDev && errorStack && (
						<pre className="overflow-auto rounded-lg border bg-muted p-4 text-xs text-muted-foreground max-h-48">
							{errorStack}
						</pre>
					)}

					<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
						<Button variant="outline" onClick={handleRetry} className="gap-2">
							<RefreshCw className="h-4 w-4" />
							Try again
						</Button>

						<Link to="/dashboard">
							<Button className="gap-2 w-full sm:w-auto">
								<Rabbit className="h-4 w-4" />
								Back to dashboard
							</Button>
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export function DashboardNotFound() {
	const router = useRouter()

	return (
		<div className="p-6">
			<Card className="max-w-2xl mx-auto">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
							<FileQuestion className="h-8 w-8 text-muted-foreground" />
						</div>
					</div>
					<CardTitle className="text-2xl">Page not found</CardTitle>
					<CardDescription className="text-base">
						The page you're looking for doesn't exist or has been moved.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
						<Button variant="outline" onClick={() => router.history.back()} className="gap-2">
							<ArrowLeft className="h-4 w-4" />
							Go back
						</Button>

						<Link to="/dashboard">
							<Button className="gap-2 w-full sm:w-auto">
								<Rabbit className="h-4 w-4" />
								Back to dashboard
							</Button>
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
