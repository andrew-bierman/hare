import { AgentWebhooksPage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/agents/$id/webhooks')({
	component: WebhooksPageWrapper,
})

function WebhooksPageWrapper() {
	const { id } = Route.useParams()
	return <AgentWebhooksPage agentId={id} />
}
