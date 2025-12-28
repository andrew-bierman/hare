import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/agents/new')({
	component: RouteComponent,
})

function RouteComponent() {
	return <div>Hello "/_dashboard/dashboard/agents/new"!</div>
}
