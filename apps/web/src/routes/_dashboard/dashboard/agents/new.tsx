import { createFileRoute } from '@tanstack/react-router'
import { AgentCreatePage } from 'web-app/pages/agents'

export const Route = createFileRoute('/_dashboard/dashboard/agents/new')({
	component: AgentCreatePage,
})
