import { AgentsListPage } from '@hare/app'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/agents')({
	component: AgentsPageWrapper,
})

function AgentsPageWrapper() {
	return <AgentsListPage />
}
