import { createFileRoute } from '@tanstack/react-router'
import { AgentCreatePage } from '@hare/app/pages'

export const Route = createFileRoute('/_dashboard/dashboard/agents/new')({
	component: AgentCreatePage,
})
