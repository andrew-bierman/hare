import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router'
import { Button } from '@hare/ui/components/button'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export function ErrorComponent({ error, reset }: ErrorComponentProps) {
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
		<div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
			<div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-6">
				<AlertTriangle className="h-10 w-10 text-destructive" />
			</div>

			<h1 className="text-4xl font-bold tracking-tight">Something went wrong</h1>

			<p className="mt-4 max-w-md text-muted-foreground">{errorMessage}</p>

			{isDev && errorStack && (
				<pre className="mt-6 max-w-2xl overflow-auto rounded-lg border bg-muted p-4 text-left text-xs text-muted-foreground">
					{errorStack}
				</pre>
			)}

			<div className="mt-8 flex flex-col gap-3 sm:flex-row">
				<Button variant="outline" onClick={handleRetry} className="gap-2">
					<RefreshCw className="h-4 w-4" />
					Try again
				</Button>

				<Link to="/">
					<Button className="gap-2">
						<Home className="h-4 w-4" />
						Back to home
					</Button>
				</Link>
			</div>
		</div>
	)
}
