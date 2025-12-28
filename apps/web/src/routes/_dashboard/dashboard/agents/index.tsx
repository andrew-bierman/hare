import { createFileRoute } from '@tanstack/react-router'
import { AgentsListPage } from 'web-app/pages/agents'

export const Route = createFileRoute('/_dashboard/dashboard/agents/')({
	component: AgentsListPage,
})
