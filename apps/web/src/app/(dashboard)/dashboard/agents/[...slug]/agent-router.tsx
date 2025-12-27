'use client'

import { Skeleton } from '@workspace/ui/components/skeleton'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'

// Lazy load the page components
const AgentBuilderPage = dynamic(() => import('./agent-builder'), {
	loading: () => <PageSkeleton />,
})

const PlaygroundPage = dynamic(() => import('./playground'), {
	loading: () => <PageSkeleton />,
})

function PageSkeleton() {
	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-9 w-64" />
					<Skeleton className="h-5 w-96" />
				</div>
			</div>
			<Skeleton className="h-64 w-full" />
		</div>
	)
}

export default function AgentRouter() {
	const params = useParams()
	const slug = params.slug as string[]

	// Route: /dashboard/agents/[id] -> AgentBuilderPage
	// Route: /dashboard/agents/[id]/playground -> PlaygroundPage
	if (slug.length === 1) {
		return <AgentBuilderPage />
	}

	if (slug.length === 2 && slug[1] === 'playground') {
		return <PlaygroundPage />
	}

	// 404 for unknown routes
	return (
		<div className="flex-1 p-8 pt-6 text-center">
			<h1 className="text-2xl font-bold">Page not found</h1>
		</div>
	)
}
