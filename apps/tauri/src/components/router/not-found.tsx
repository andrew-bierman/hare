import { Button } from '@hare/ui/components/button'
import { Link, useRouter } from '@tanstack/react-router'
import { ArrowLeft, FileQuestion, Home } from 'lucide-react'

export function NotFound() {
	const router = useRouter()

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
			<div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
				<FileQuestion className="h-10 w-10 text-muted-foreground" />
			</div>

			<h1 className="text-4xl font-bold tracking-tight">Page not found</h1>

			<p className="mt-4 max-w-md text-muted-foreground">
				The page you're looking for doesn't exist or has been moved.
			</p>

			<div className="mt-8 flex flex-col gap-3 sm:flex-row">
				<Button variant="outline" onClick={() => router.history.back()} className="gap-2">
					<ArrowLeft className="h-4 w-4" />
					Go back
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
