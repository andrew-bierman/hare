import { AgentDetailPage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/agents/$id/')({
	component: AgentDetailPageWrapper,
})

function AgentDetailPageWrapper() {
	const { id } = Route.useParams()
	return <AgentDetailPage agentId={id} />
}
