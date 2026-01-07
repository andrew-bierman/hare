import { AgentPlaygroundPage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/agents/$id/playground')({
	component: PlaygroundPageWrapper,
})

function PlaygroundPageWrapper() {
	const { id } = Route.useParams()
	return <AgentPlaygroundPage agentId={id} />
}
