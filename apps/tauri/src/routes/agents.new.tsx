import { AgentCreatePage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/agents/new')({
	component: AgentCreatePage,
})
