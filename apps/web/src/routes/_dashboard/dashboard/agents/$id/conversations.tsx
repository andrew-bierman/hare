import { AgentConversationsPage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/agents/$id/conversations')({
	component: ConversationsPageWrapper,
})

function ConversationsPageWrapper() {
	const { id } = Route.useParams()
	return <AgentConversationsPage agentId={id} />
}
