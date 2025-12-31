import { AgentTemplatesPage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/agents/templates')({
	component: AgentTemplatesPage,
})
